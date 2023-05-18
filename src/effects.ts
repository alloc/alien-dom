import { isFunction } from '@alloc/is'
import type { AnyElement } from './internal/types'
import { onMount, onUnmount } from './domObserver'
import { kAlienEffects, kAlienFragment } from './internal/symbols'
import { currentEffects } from './internal/global'
import { Disposable, attachDisposer } from './disposable'
import { isFragment } from './internal/duck'
import {
  enableEffect,
  disableEffect,
  EffectFlags,
  runEffect,
} from './internal/effects'

type Promisable<T> = T | Promise<T>

export interface AlienEffect<
  Target = any,
  Args extends any[] = any[],
  Async extends boolean = boolean,
> {
  (
    target: Target,
    ...args: boolean extends Async
      ? any[]
      : Async extends true
      ? [AbortSignal, ...Args]
      : Args
  ): Async extends true ? Promisable<(() => void) | void> : (() => void) | void
  context?: AlienEffects
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
export class AlienEffects<Element extends AnyElement = any> {
  enabled = false
  mounted = false
  element?: Element | Comment = undefined
  effects?: Set<AlienEffect> = undefined
  currentEffect: AlienEffect | null = null
  abortCtrl?: AbortController = undefined
  protected _mountEffect: Disposable | null = null

  constructor(element?: Element | Comment | DocumentFragment) {
    element && this.setElement(element)
  }

  setElement(element: Element | Comment | DocumentFragment | null) {
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
        if (element === this.element) {
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
      if (isFragment(element)) {
        element = (kAlienFragment(element) || element.childNodes)[0] as
          | Element
          | Comment
      }

      // Assume the element will be mounted soon, if it's not already.
      this.mounted = true
      this.element = element
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
      return enableEffect(this, effect, 0, target, arguments.length > 2 && args)
    }

    if (!this.enabled) {
      this.enabled = true
      currentEffects.push(this)
      try {
        this.effects?.forEach(this._runEffect, this)
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
  enableOnce(effect: AlienEffect<void, [], false>): Disposable<typeof effect>

  enableOnce<Args extends any[]>(
    effect: AlienEffect<void, Args, false>,
    args: Args
  ): Disposable<typeof effect>

  enableOnce<T extends object, Args extends any[] = []>(
    effect: AlienEffect<T, Args, false>,
    target: T,
    args?: Args
  ): Disposable<typeof effect>

  /** @internal */
  enableOnce(effect: AlienEffect<any, any[], false>, target?: any, args?: any) {
    return enableEffect(
      this,
      effect,
      EffectFlags.Once,
      target,
      arguments.length > 2 && args
    )
  }

  enableAsync(effect: AlienEffect<void, [], true>): Disposable<typeof effect>

  enableAsync<Args extends any[]>(
    effect: AlienEffect<void, Args, true>,
    args: Args
  ): Disposable<typeof effect>

  enableAsync<T extends object, Args extends any[] = []>(
    effect: AlienEffect<T, Args, true>,
    target: T,
    args?: Args
  ): Disposable<typeof effect>

  /** @internal */
  enableAsync(
    effect: AlienEffect<any, any[], true>,
    target?: any,
    args?: any
  ): any {
    return enableEffect(
      this,
      effect,
      EffectFlags.Async,
      target,
      arguments.length > 2 && args
    )
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
    return enableEffect(
      this,
      effect,
      EffectFlags.Once | EffectFlags.Async,
      target,
      arguments.length > 2 && args
    )
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

  protected _runEffect(effect: AlienEffect) {
    return runEffect(effect, this)
  }
}

/**
 * Bound effects have their `target` and `args` pre-defined.
 */
export type AlienBoundEffect<
  Target = any,
  Args extends any[] = any,
  Async extends boolean = boolean,
> = {
  enable: AlienEffect<Target, Args, Async>
  target?: Target
  args?: Args
}

/**
 * If the `currentEffects` context (or the given `context`) is enabled,
 * this effect will be enabled immediately.
 */
export function createEffect<
  Effect extends
    AlienEffect<void, [], false> | AlienBoundEffect<any, any, false>,
>(effect: Effect, context?: AlienEffects): Disposable<typeof effect>

export function createEffect<
  Effect extends AlienEffect<void, [], true> | AlienBoundEffect<any, any, true>,
>(
  effect: Effect,
  context: AlienEffects | undefined,
  flags: EffectFlags.Async
): Disposable<typeof effect>

export function createEffect(
  effect: AlienEffect<void, [], boolean> | AlienBoundEffect<any, any, boolean>,
  context = currentEffects.get(),
  flags: EffectFlags | 0 = 0
): Disposable<typeof effect> {
  if (context) {
    return isFunction(effect)
      ? enableEffect(context, effect, flags, effect.target, false)
      : enableEffect(context, effect.enable, flags, effect.target, effect.args)
  }
  const effectFn = isFunction(effect) ? effect : effect.enable
  runEffect(effectFn, null, flags, effect.target, effect.args)
  return attachDisposer(effect, () => effectFn.disable?.())
}

export const createAsyncEffect = <
  Effect extends AlienEffect<void, [], true> | AlienBoundEffect<any, any, true>,
>(
  effect: Effect,
  context?: AlienEffects
): Disposable<Effect> => createEffect(effect, context, EffectFlags.Async)

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
    return createEffect(effect)
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
