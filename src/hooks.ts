import { onMount, onUnmount } from './domObserver'
import type { AlienElement } from './element'
import { AnyElement } from './internal/types'
import { currentHooks } from './global'
import { kAlienHooks, kAlienFragment } from './symbols'
import { noop } from './jsx-dom/util'
import { kFragmentNodeType } from './internal/constants'

type Promisable<T> = T | Promise<T>

export * from './hooks/useAsync'
export * from './hooks/useContext'
export * from './hooks/useEffect'
export * from './hooks/useMemo'
export * from './hooks/useMicrotask'
export * from './hooks/useRef'
export * from './hooks/useSpring'
export * from './hooks/useState'
export * from './hooks/useStyle'

export interface AlienEnabler<
  Target = any,
  Args extends any[] = any[],
  Async extends boolean = boolean
> {
  (
    target: Target,
    ...args: Async extends true ? [AbortSignal, ...Args] : Args
  ): Async extends true ? Promisable<(() => void) | void> : (() => void) | void
  context?: AlienHooks
  target?: Target
  args?: Args
  async?: Async
  disable?: () => void
  once?: boolean
}

/**
 * Hook into an element's lifecycle (mount, unmount, enable, disable).
 *
 * Any `enable` or `disable` callbacks will be run when the element is
 * mounted or unmounted, respectively. If the element is already mounted,
 * any `enable` callbacks will be run immediately.
 */
export class AlienHooks<Element extends AnyElement = any> {
  enabled = false
  mounted = false
  element?: AlienElement<Element> = undefined
  enablers?: Set<AlienEnabler> = undefined
  currentEnabler: AlienEnabler | null = null
  abortCtrl?: AbortController = undefined
  protected _mountHook: Disposable | null = null

  constructor(element?: Element) {
    element && this.setElement(element)
  }

  setElement(element: Element | null) {
    if (element === null) {
      if (this.element) {
        if (kAlienHooks(this.element) === this) {
          kAlienHooks(this.element, undefined)
        }
        this.element = undefined
      }
      if (this._mountHook) {
        this._mountHook.dispose()
        this._mountHook = null
      } else {
        this.disable()
      }
    } else {
      if (this.element !== undefined) {
        if ((element as any) === this.element) {
          return
        }
        if (!this._mountHook) {
          throw Error('Cannot change element while mounted')
        }
        kAlienHooks(this.element, undefined)
        this._mountHook.dispose()
        this._mountHook = null
      }

      // If the hooks are being attached to a document fragment, use the
      // first child instead. For component hooks, this should be a
      // comment node created for exactly this purpose.
      if (element.nodeType === kFragmentNodeType) {
        element = (kAlienFragment(element) || element.childNodes)[0] as any
      }

      // Assume the element will be mounted soon, if it's not already.
      this.mounted = true
      this.element = element as any
      kAlienHooks(element, this)

      if (element) {
        if (element.isConnected) {
          this.enable()
        } else {
          this._enableOnceMounted()
        }
      }
    }
  }

  /**
   * Add a callback to run when the scope is enabled. If the scope is
   * currently enabled, the callback will be run immediately.
   */
  enable(enabler: AlienEnabler<void, [], false>): Disposable<typeof enabler>

  enable<Args extends any[]>(
    enabler: AlienEnabler<void, Args, false>,
    args: Args
  ): Disposable<typeof enabler>

  enable<T extends object | void, Args extends any[] = []>(
    enabler: AlienEnabler<T, Args, false>,
    target: T,
    args?: Args
  ): Disposable<typeof enabler>

  /**
   * Enable the scope. If there are any `enable` callbacks, they will be
   * run.
   */
  enable(): void

  /** @internal */
  enable(enabler?: AlienEnabler<any, any[], false>, target?: any, args?: any) {
    if (enabler) {
      enabler.target = target
      if (arguments.length > 2) {
        enabler.args = args
      }

      this.enablers ||= new Set()
      this.enablers.add(enabler)
      if (this.enabled) {
        // If the enabler is being retargeted, this is needed.
        disableHook(enabler)
        currentHooks.push(this)
        try {
          this._enableHook(enabler)
        } finally {
          this.currentEnabler = null
          currentHooks.pop(this)
        }
      }

      return attachDisposer(enabler, () => {
        disableHook(enabler)
        this.enablers?.delete(enabler)
      })
    }

    if (!this.enabled) {
      this.enabled = true
      currentHooks.push(this)
      try {
        this.enablers?.forEach(this._enableHook, this)
        if (this.element) {
          onUnmount(this.element, () => {
            this.mounted = false
            this.disable()
          })
        }
      } finally {
        this.currentEnabler = null
        currentHooks.pop(this)
      }
    }
  }

  /**
   * Tear down any subscriptions, including `disable` callbacks.
   */
  disable() {
    if (this.enabled) {
      this.enabled = false
      this.enablers?.forEach(enabler => {
        disableHook(enabler)
        if (enabler.once) {
          this.enablers?.delete(enabler)
        }
      })
      if (this.element && !this.element.isConnected) {
        this._enableOnceMounted()
      }
    }
  }

  /** @internal */
  remove(enabler: AlienEnabler) {
    this.enablers?.delete(enabler)
    disableHook(enabler)
  }

  /**
   * Add a callback to run when the scope is next enabled.
   */
  enableOnce(enabler: AlienEnabler<void, [], false>): typeof enabler

  enableOnce<Args extends any[]>(
    enabler: AlienEnabler<void, Args, false>,
    args: Args
  ): typeof enabler

  enableOnce<T extends object, Args extends any[] = []>(
    enabler: AlienEnabler<T, Args, false>,
    target: T,
    args?: Args
  ): typeof enabler

  /** @internal */
  enableOnce(
    enabler: AlienEnabler<any, any[], false>,
    target?: any,
    args?: any
  ) {
    enabler.once = true
    return this.enable(enabler, target, args)
  }

  enableAsync(enabler: AlienEnabler<void, [], true>): typeof enabler

  enableAsync<Args extends any[]>(
    enabler: AlienEnabler<void, Args, true>,
    args: Args
  ): typeof enabler

  enableAsync<T extends object, Args extends any[] = []>(
    enabler: AlienEnabler<T, Args, true>,
    target: T,
    args?: Args
  ): typeof enabler

  /** @internal */
  enableAsync(
    enabler: AlienEnabler<any, any[], true>,
    target?: any,
    args?: any
  ): any {
    enabler.async = true
    return this.enable(enabler as any, target, args)
  }

  enableOnceAsync(enabler: AlienEnabler<void, [], true>): typeof enabler

  enableOnceAsync<Args extends any[]>(
    enabler: AlienEnabler<void, Args, true>,
    args: Args
  ): typeof enabler

  enableOnceAsync<T extends object, Args extends any[] = []>(
    enabler: AlienEnabler<T, Args, true>,
    target: T,
    args?: Args
  ): typeof enabler

  /** @internal */
  enableOnceAsync(
    enabler: AlienEnabler<any, any[], true>,
    target?: any,
    args?: any
  ): any {
    enabler.async = enabler.once = true
    return this.enable(enabler as any, target, args)
  }

  protected _enableOnceMounted() {
    // This assumes that the element will eventually be mounted. If
    // it's not, a memory leak will occur.
    this._mountHook = onMount(this.element!, () => {
      this._mountHook = null
      this.mounted = true
      this.enable()
    })
  }

  protected _enableHook(enabler: AlienEnabler) {
    this.currentEnabler = enabler
    enabler.context = this

    let args = enabler.args || []
    if (enabler.async) {
      this.abortCtrl ||= new AbortController()
      args = [this.abortCtrl.signal, ...args]
    }

    const disable = enabler(enabler.target, ...args)
    if (disable instanceof Promise) {
      if (!enabler.async) {
        throw Error('Cannot return promise from non-async enabler')
      }
      disable.then(
        disable => {
          if (typeof disable == 'function') {
            enabler.disable = disable
          }
        },
        error => {
          if (error.name != 'AbortError') {
            console.error(error)
          }
        }
      )
    } else if (typeof disable == 'function') {
      enabler.disable = disable
    }
  }
}

function disableHook(enabler: AlienEnabler) {
  const { disable } = enabler
  enabler.context = undefined
  if (disable) {
    enabler.disable = undefined
    disable()
  }
}

export type AlienHook<
  Target = any,
  Args extends any[] = any,
  Async extends boolean = boolean
> = {
  enable: AlienEnabler<Target, Args, Async>
  target?: Target
  args?: Args
}

export function createHook<
  Hook extends AlienEnabler<void, [], false> | AlienHook<any, any, false>
>(hook: Hook, context = currentHooks.get()): Disposable<Hook> {
  if (context) {
    return (
      typeof hook == 'function'
        ? context.enable(hook, hook.target)
        : context.enable(hook.enable, hook.target, hook.args)
    ) as Disposable<Hook>
  }
  let dispose: Promisable<(() => void) | void>
  if (typeof hook == 'function') {
    dispose = hook(hook.target, ...(hook.args || []))
  } else {
    dispose = hook.enable(hook.target, ...(hook.args || []))
  }
  if (dispose instanceof Promise) {
    throw Error('Cannot return promise from non-async enabler')
  }
  return attachDisposer(hook, dispose || noop)
}

export function createHookAsync<
  Hook extends AlienEnabler<void, [], true> | AlienHook<any, any, true>
>(hook: Hook, context?: AlienHooks): Disposable<typeof hook> {
  if (typeof hook == 'function') {
    hook.async = true
  } else {
    hook.enable.async = true
  }
  return createHook(hook as any, context)
}

export type AlienHookType<Args extends any[]> = (
  ...args: Args
) => Args extends [infer Target, ...infer Args]
  ? Disposable<AlienHook<Target, Args>>
  : never

export function createHookType<Args extends any[]>(
  enable: (...args: Args) => (() => void) | void
): AlienHookType<Args> {
  return ((target: any, ...args: any[]) => {
    const enabler = enable.bind(null) as any
    enabler.target = target
    enabler.args = args
    return createHook(enabler)
  }) as any
}

/**
 * Useful when a hook wants to remove itself. It should call this when
 * setting itself up.
 */
export function getCurrentHook() {
  const context = currentHooks.get()
  if (context) {
    return context.currentEnabler
  }
}

export type Disposable<T = {}> = T & { dispose(): void }

function attachDisposer<T extends object>(
  object: T,
  dispose: () => void
): Disposable<T> {
  Object.defineProperty(object, 'dispose', {
    value: dispose,
    configurable: true,
    enumerable: true,
  })
  return object as any
}
