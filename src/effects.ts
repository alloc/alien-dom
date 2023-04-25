import type { AnyElement } from './internal/types'
import type { AlienElement } from './element'
import { onMount, onUnmount } from './domObserver'
import { kAlienEffects, kAlienFragment } from './symbols'
import { kFragmentNodeType } from './internal/constants'
import { currentEffects } from './global'
import { noop } from './jsx-dom/util'

type Promisable<T> = T | Promise<T>

export interface AlienEffect<
  Target = any,
  Args extends any[] = any[],
  Async extends boolean = boolean
> {
  (
    target: Target,
    ...args: Async extends true ? [AbortSignal, ...Args] : Args
  ): Async extends true ? Promisable<(() => void) | void> : (() => void) | void
  context?: AlienEffectContext
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
export class AlienEffectContext<Element extends AnyElement = any> {
  enabled = false
  mounted = false
  element?: AlienElement<Element> = undefined
  effects?: Set<AlienEffect> = undefined
  currentEffect: AlienEffect | null = null
  abortCtrl?: AbortController = undefined
  protected _mountEffect: Disposable | null = null

  constructor(element?: Element) {
    element && this.setElement(element)
  }

  setElement(element: Element | null) {
    if (element === null) {
      if (this.element) {
        if (kAlienEffects(this.element) === this) {
          kAlienEffects(this.element, undefined)
        }
        this.element = undefined
      }
      if (this._mountEffect) {
        this._mountEffect.dispose()
        this._mountEffect = null
      } else {
        this.disable()
      }
    } else {
      if (this.element !== undefined) {
        if ((element as any) === this.element) {
          return
        }
        if (!this._mountEffect) {
          throw Error('Cannot change element while mounted')
        }
        kAlienEffects(this.element, undefined)
        this._mountEffect.dispose()
        this._mountEffect = null
      }

      // If the effects are being attached to a document fragment, use
      // the first child instead. For component effects, this should be
      // a comment node created for exactly this purpose.
      if (element.nodeType === kFragmentNodeType) {
        element = (kAlienFragment(element) || element.childNodes)[0] as any
      }

      // Assume the element will be mounted soon, if it's not already.
      this.mounted = true
      this.element = element as any
      kAlienEffects(element, this)

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
  enable(effect: AlienEffect<void, [], false>): Disposable<typeof effect>

  enable<Args extends any[]>(
    effect: AlienEffect<void, Args, false>,
    args: Args
  ): Disposable<typeof effect>

  enable<T extends object | void, Args extends any[] = []>(
    effect: AlienEffect<T, Args, false>,
    target: T,
    args?: Args
  ): Disposable<typeof effect>

  /**
   * Enable the scope. If there are any `enable` callbacks, they will be
   * run.
   */
  enable(): void

  /** @internal */
  enable(effect?: AlienEffect<any, any[], false>, target?: any, args?: any) {
    if (effect) {
      effect.target = target
      if (arguments.length > 2) {
        effect.args = args
      }

      this.effects ||= new Set()
      this.effects.add(effect)
      if (this.enabled) {
        // If the effect is being retargeted, this is needed.
        disableEffect(effect)
        currentEffects.push(this)
        try {
          this._enableEffect(effect)
        } finally {
          this.currentEffect = null
          currentEffects.pop(this)
        }
      }

      return attachDisposer(effect, () => {
        disableEffect(effect)
        this.effects?.delete(effect)
      })
    }

    if (!this.enabled) {
      this.enabled = true
      currentEffects.push(this)
      try {
        this.effects?.forEach(this._enableEffect, this)
        if (this.element) {
          onUnmount(this.element, () => {
            this.mounted = false
            this.disable()
          })
        }
      } finally {
        this.currentEffect = null
        currentEffects.pop(this)
      }
    }
  }

  /**
   * Tear down any subscriptions, including `disable` callbacks.
   */
  disable() {
    if (this.enabled) {
      this.enabled = false
      this.abortCtrl?.abort()
      this.effects?.forEach(effect => {
        disableEffect(effect)
        if (effect.once) {
          this.effects?.delete(effect)
        }
      })
      if (this.element && !this.element.isConnected) {
        this._enableOnceMounted()
      }
    }
  }

  /** @internal */
  remove(effect: AlienEffect) {
    this.effects?.delete(effect)
    disableEffect(effect)
  }

  /**
   * Add a callback to run when the scope is next enabled.
   */
  enableOnce(effect: AlienEffect<void, [], false>): typeof effect

  enableOnce<Args extends any[]>(
    effect: AlienEffect<void, Args, false>,
    args: Args
  ): typeof effect

  enableOnce<T extends object, Args extends any[] = []>(
    effect: AlienEffect<T, Args, false>,
    target: T,
    args?: Args
  ): typeof effect

  /** @internal */
  enableOnce(effect: AlienEffect<any, any[], false>, target?: any, args?: any) {
    effect.once = true
    return this.enable(effect, target, args)
  }

  enableAsync(effect: AlienEffect<void, [], true>): typeof effect

  enableAsync<Args extends any[]>(
    effect: AlienEffect<void, Args, true>,
    args: Args
  ): typeof effect

  enableAsync<T extends object, Args extends any[] = []>(
    effect: AlienEffect<T, Args, true>,
    target: T,
    args?: Args
  ): typeof effect

  /** @internal */
  enableAsync(
    effect: AlienEffect<any, any[], true>,
    target?: any,
    args?: any
  ): any {
    effect.async = true
    return this.enable(effect as any, target, args)
  }

  enableOnceAsync(effect: AlienEffect<void, [], true>): typeof effect

  enableOnceAsync<Args extends any[]>(
    effect: AlienEffect<void, Args, true>,
    args: Args
  ): typeof effect

  enableOnceAsync<T extends object, Args extends any[] = []>(
    effect: AlienEffect<T, Args, true>,
    target: T,
    args?: Args
  ): typeof effect

  /** @internal */
  enableOnceAsync(
    effect: AlienEffect<any, any[], true>,
    target?: any,
    args?: any
  ): any {
    effect.async = effect.once = true
    return this.enable(effect as any, target, args)
  }

  protected _enableOnceMounted() {
    // This assumes that the element will eventually be mounted. If
    // it's not, a memory leak will occur.
    this._mountEffect = onMount(this.element!, () => {
      this._mountEffect = null
      this.mounted = true
      this.enable()
    })
  }

  protected _enableEffect(effect: AlienEffect) {
    this.currentEffect = effect
    effect.context = this

    let args = effect.args || []
    if (effect.async) {
      this.abortCtrl ||= new AbortController()
      args = [this.abortCtrl.signal, ...args]
    }

    const disable = effect(effect.target, ...args)
    if (disable instanceof Promise) {
      if (!effect.async) {
        throw Error('Cannot return promise from non-async effect')
      }
      disable.then(
        disable => {
          if (typeof disable == 'function') {
            effect.disable = disable
          }
        },
        error => {
          if (error.name != 'AbortError') {
            console.error(error)
          }
        }
      )
    } else if (typeof disable == 'function') {
      effect.disable = disable
    }
  }
}

function disableEffect(effect: AlienEffect) {
  const { disable } = effect
  effect.context = undefined
  if (disable) {
    effect.disable = undefined
    disable()
  }
}

/**
 * Bound effects have their `target` and `args` pre-defined.
 */
export type AlienBoundEffect<
  Target = any,
  Args extends any[] = any,
  Async extends boolean = boolean
> = {
  enable: AlienEffect<Target, Args, Async>
  target?: Target
  args?: Args
}

/**
 * If the `currentEffects` context (or the given `context`) is enabled,
 * this effect will be enabled immediately.
 */
export function enableEffect<
  Effect extends
    | AlienEffect<void, [], false>
    | AlienBoundEffect<any, any, false>
>(effect: Effect, context = currentEffects.get()): Disposable<Effect> {
  if (context) {
    return (
      typeof effect == 'function'
        ? context.enable(effect, effect.target)
        : context.enable(effect.enable, effect.target, effect.args)
    ) as Disposable<Effect>
  }
  let dispose: Promisable<(() => void) | void>
  if (typeof effect == 'function') {
    dispose = effect(effect.target, ...(effect.args || []))
  } else {
    dispose = effect.enable(effect.target, ...(effect.args || []))
  }
  if (dispose instanceof Promise) {
    throw Error('Cannot return promise from non-async effect')
  }
  return attachDisposer(effect, dispose || noop)
}

export function enableAsyncEffect<
  Effect extends AlienEffect<void, [], true> | AlienBoundEffect<any, any, true>
>(effect: Effect, context?: AlienEffectContext): Disposable<Effect> {
  if (typeof effect == 'function') {
    effect.async = true
  } else {
    effect.enable.async = true
  }
  return enableEffect(effect as any, context)
}

export type AlienEffectType<Args extends any[]> = (
  ...args: Args
) => Args extends [infer Target, ...infer Args]
  ? Disposable<AlienBoundEffect<Target, Args>>
  : never

export function defineEffectType<Args extends any[]>(
  enable: (...args: Args) => (() => void) | void
): AlienEffectType<Args> {
  return ((target: any, ...args: any[]) => {
    const effect = enable.bind(null) as any
    effect.target = target
    effect.args = args
    return enableEffect(effect)
  }) as any
}

/**
 * Useful when an effect wants to remove itself. It should call this
 * when setting itself up.
 */
export function getCurrentEffect() {
  const context = currentEffects.get()
  if (context) {
    return context.currentEffect
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
