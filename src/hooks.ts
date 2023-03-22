import { onMount, onUnmount } from './domObserver'
import type { AlienElement } from './element'
import { AnyElement } from './internal/types'
import { currentHooks, currentComponent } from './global'
import { ref, Ref } from './signals'
import { kAlienHooks, setSymbol } from './symbols'

export function useEffect(
  effect: () => (() => void) | void,
  deps: readonly any[]
) {
  const scope = currentComponent.get()!
  const index = scope.memoryIndex++
  const state = (scope.memory[index] ||= { deps, dispose: undefined })

  const prevDeps = state.deps
  const shouldRun =
    deps == prevDeps ||
    deps.length != prevDeps.length ||
    deps.some((dep, i) => dep !== prevDeps[i])

  if (shouldRun) {
    state.dispose?.()
    state.deps = deps
    state.dispose = effect()
  }
}

export function useRef<T>(init: T | (() => T)): Ref<T> {
  const scope = currentComponent.get()!
  const index = scope.memoryIndex++
  return (scope.memory[index] ||= ref(init instanceof Function ? init() : init))
}

export interface AlienEnabler<Target = any, Args extends any[] = any[]> {
  (target: Target, ...args: Args): (() => void) | void
  context?: AlienHooks
  target?: Target
  args?: Args
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
  element?: AlienElement<Element> = undefined
  enablers?: Set<AlienEnabler> = undefined
  currentEnabler: AlienEnabler | null = null

  constructor(element?: AlienElement<Element>) {
    element && this.setElement(element)
  }

  setElement(element: AlienElement<Element>) {
    if (this.element) {
      throw Error('Element already set')
    }
    setSymbol(element, kAlienHooks, this)
    this.element = element
    if (element) {
      if (document.contains(element)) {
        this.enable()
      } else {
        this._enableOnceMounted()
      }
    }
  }

  /**
   * Enable the scope. If there are any `enable` callbacks, they will be
   * run.
   *
   * Note: You should only call this method if you know what you're
   * doing. Otherwise, prefer `element.enableHooks()` instead.
   */
  enable(): void

  /**
   * Add a callback to run when the scope is enabled. If the scope is
   * currently enabled, the callback will be run immediately.
   */
  enable(enabler: AlienEnabler<void, []>): Disposable<typeof enabler>

  /**
   * Add a callback to run when the scope is enabled. If the scope is
   * currently enabled, the callback will be run immediately.
   */
  enable<Args extends any[]>(
    enabler: AlienEnabler<void, Args>,
    args: Args
  ): Disposable<typeof enabler>

  /**
   * Add a callback to run when the scope is enabled. If the scope is
   * currently enabled, the callback will be run immediately.
   */
  enable<T extends object, Args extends any[] = []>(
    enabler: AlienEnabler<T, Args>,
    target: T,
    args?: Args
  ): Disposable<typeof enabler>

  /** @internal */
  enable(enabler?: AlienEnabler, target?: any, args?: any) {
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
        enableHooks(this, () => {
          enableHook(enabler)
        })
      }

      return attachDisposer(enabler, () => {
        disableHook(enabler)
        this.enablers!.delete(enabler)
      })
    }
    if (!this.enabled) {
      enableHooks(this, () => {
        if (this.enablers) {
          this.enablers.forEach(enabler => {
            enableHook(enabler)
          })
        }
      })
    }
  }

  /**
   * Tear down any subscriptions, including `disable` callbacks.
   *
   * Note: You should only call this method if you know what you're
   * doing. Otherwise, prefer `element.disableHooks()` instead.
   */
  disable() {
    if (this.enabled) {
      this.enabled = false
      this.enablers?.forEach(enabler => {
        disableHook(enabler)
        if (enabler.once) {
          this.enablers!.delete(enabler)
        }
      })
      if (this.element && !document.contains(this.element)) {
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
  enableOnce(enabler: AlienEnabler<void, []>): typeof enabler

  /**
   * Add a callback to run when the scope is next enabled.
   */
  enableOnce<Args extends any[]>(
    enabler: AlienEnabler<void, Args>,
    args: Args
  ): typeof enabler

  /**
   * Add a callback to run when the scope is next enabled.
   */
  enableOnce<T extends object, Args extends any[] = []>(
    enabler: AlienEnabler<T, Args>,
    target: T,
    args?: Args
  ): typeof enabler

  /** @internal */
  enableOnce(enabler: AlienEnabler, target?: any, args?: any) {
    enabler.once = true
    return this.enable(enabler, target, args)
  }

  protected _enableOnceMounted() {
    // This assumes that the element will eventually be mounted. If
    // it's not, a memory leak will occur.
    onMount(this.element!, () => {
      this.enable()
    })
  }
}

function enableHooks(hooks: AlienHooks, enable: () => void) {
  const wasEnabled = hooks.enabled
  currentHooks.push(hooks)
  enable()
  if (!wasEnabled && hooks.element) {
    onUnmount(hooks.element, () => {
      hooks.disable()
    })
  }
  currentHooks.pop(hooks)
  hooks.enabled = true
}

function enableHook(enabler: AlienEnabler) {
  const context = currentHooks.get()!
  context.currentEnabler = enabler
  enabler.context = context
  try {
    const disable = enabler(enabler.target, ...(enabler.args || []))
    if (typeof disable == 'function') {
      enabler.disable = disable
    }
  } finally {
    context.currentEnabler = null
  }
}

function disableHook(enabler: AlienEnabler) {
  enabler.context = undefined
  if (enabler.disable) {
    enabler.disable()
    enabler.disable = undefined
  }
}

export type AlienHook<Target = any, Args extends any[] = any> = {
  enable: AlienEnabler<Target, Args>
  target?: Target
  args?: Args
}

const noop = () => {}

export function createHook<Hook extends AlienEnabler<void, []> | AlienHook>(
  hook: Hook,
  context = currentHooks.get()
): Disposable<typeof hook> {
  let dispose: (() => void) | void
  if (context) {
    if (typeof hook == 'function') {
      context.enable(hook)
    } else {
      context.enable(hook.enable, hook.target, hook.args)
    }
  } else if (typeof hook == 'function') {
    dispose = hook()
  } else {
    dispose = hook.enable(hook.target, ...(hook.args || []))
  }
  return attachDisposer(hook, dispose || noop)
}

export type AlienHookType<Args extends any[]> = (
  ...args: Args
) => Args extends [infer Target, ...infer Args]
  ? Disposable<AlienHook<Target, Args>>
  : never

export function createHookType<Args extends any[]>(
  enable: (...args: Args) => (() => void) | void
): AlienHookType<Args> {
  return ((target: any, ...args: any[]) =>
    createHook({ enable, target, args } as any)) as any
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
