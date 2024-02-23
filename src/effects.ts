import { isArray, isFunction } from '@alloc/is'
import { Disposable, attachDisposer } from './addons/disposable'
import { onMount, onUnmount } from './addons/domObserver'
import { Promisable } from './addons/promises'
import { EffectResult } from './hooks'
import {
  EffectFlags,
  disableEffect,
  disableEffects,
  enableEffect,
  runEffect,
} from './internal/effects'
import { currentEffects } from './internal/global'
import { popValue } from './internal/stack'
import { kAlienEffects } from './internal/symbols'
import type { AnyElement } from './internal/types'
import { lastValue } from './internal/util'

export interface AlienEffect<
  Target = any,
  Args extends any[] = any[],
  Async extends boolean = boolean
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

const enum AlienEffectState {
  Disabled = 0,
  Disabling = 1,
  Enabling = 2,
  Enabled = 3,
}

/**
 * Hook into an element's lifecycle (mount, unmount, enable, disable).
 *
 * Any `enable` or `disable` callbacks will be run when the element is
 * mounted or unmounted, respectively. If the element is already mounted,
 * any `enable` callbacks will be run immediately.
 */
export class AlienEffects<Element extends AnyElement = any> {
  state = AlienEffectState.Disabled
  mounted = false
  rootNode?: Node = undefined

  effects?: Set<AlienEffect> = undefined
  currentEffect: AlienEffect | null = null
  abortCtrl?: AbortController = undefined

  protected _mountEffect: Disposable | null = null

  constructor(readonly element?: Element | Comment, rootNode?: Node) {
    if (element) {
      kAlienEffects(element, this)

      if (!rootNode && element.isConnected) {
        rootNode = element.getRootNode()
      }

      // Assume the element will be mounted soon, if it's not already.
      this.mounted = true
      this.rootNode = rootNode

      if (element) {
        this.enableOnceMounted(element, rootNode)
      }
    }
  }

  get enabled() {
    return this.state > AlienEffectState.Disabling
  }

  get partiallyEnabled() {
    return this.state === AlienEffectState.Enabling
  }

  /**
   * Run all current and future effects until disabled.
   */
  enable() {
    if (!this.enabled) {
      this.state = AlienEffectState.Enabling
      currentEffects.push(this)
      try {
        this.effects?.forEach(this._runEffect, this)
        this.state = AlienEffectState.Enabled
      } finally {
        this.currentEffect = null
        popValue(currentEffects, this)
      }
      if (this.element) {
        this._mountEffect = onUnmount(this.element, () => {
          this.mounted = false
          this.disable()
        })
      }
    }
  }

  /** @internal */
  enableOnceMounted(element: Element | Comment, rootNode?: Node) {
    if (element.isConnected) {
      return this.enable()
    }
    // This assumes that the element will eventually be mounted. If
    // it's not, a memory leak will occur.
    this._mountEffect = onMount(
      element,
      () => {
        this._mountEffect = null
        this.mounted = true
        this.enable()
      },
      // This is needed for within a ShadowRoot.
      rootNode
    )
  }

  /**
   * Disable all current effects and prevent future effects from running.
   */
  disable(destroy?: boolean) {
    if (destroy && this._mountEffect) {
      this._mountEffect.dispose()
      this._mountEffect = null
    }
    if (this.enabled) {
      this.state = AlienEffectState.Disabling

      disableEffects(this, destroy)
      if (!destroy && this.element && !this.element.isConnected) {
        this.enableOnceMounted(this.element, this.rootNode)
      }

      this.state = AlienEffectState.Disabled
    }
  }

  /** @internal */
  remove(effect: AlienEffect) {
    this.effects?.delete(effect)
    disableEffect(effect)
  }

  /**
   * Add an effect to run when `this` is enabled. If `this` is currently
   * enabled, the effect will run immediately.
   *
   * If the given `effect` is already known to `this`, it can still have its
   * target and arguments changed through this method.
   */
  run(effect: AlienEffect<void, [], false>): Disposable<typeof effect>

  run<Args extends any[]>(
    effect: AlienEffect<void, Args, false>,
    args: Args
  ): Disposable<typeof effect>

  run<T extends object | void, Args extends any[] = []>(
    effect: AlienEffect<T, Args, false>,
    target: T,
    args?: Args
  ): Disposable<typeof effect>

  run(effect: AlienEffect<any, any[], false>, target?: any, args?: any) {
    if (isArray(target)) {
      args = target
      target = void 0
    } else if (arguments.length < 3) {
      args = false
    }
    return enableEffect(this, effect, 0, target, args)
  }

  /**
   * Add a callback to run when the scope is next enabled.
   */
  runOnce(effect: AlienEffect<void, [], false>): Disposable<typeof effect>

  runOnce<Args extends any[]>(
    effect: AlienEffect<void, Args, false>,
    args: Args
  ): Disposable<typeof effect>

  runOnce<T extends object, Args extends any[] = []>(
    effect: AlienEffect<T, Args, false>,
    target: T,
    args?: Args
  ): Disposable<typeof effect>

  /** @internal */
  runOnce(effect: AlienEffect<any, any[], false>, target?: any, args?: any) {
    return enableEffect(
      this,
      effect,
      EffectFlags.Once,
      target,
      arguments.length > 2 && args
    )
  }

  runAsync(effect: AlienEffect<void, [], true>): Disposable<typeof effect>

  runAsync<Args extends any[]>(
    effect: AlienEffect<void, Args, true>,
    args: Args
  ): Disposable<typeof effect>

  runAsync<T extends object, Args extends any[] = []>(
    effect: AlienEffect<T, Args, true>,
    target: T,
    args?: Args
  ): Disposable<typeof effect>

  /** @internal */
  runAsync(
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

  runOnceAsync(effect: AlienEffect<void, [], true>): typeof effect

  runOnceAsync<Args extends any[]>(
    effect: AlienEffect<void, Args, true>,
    args: Args
  ): typeof effect

  runOnceAsync<T extends object, Args extends any[] = []>(
    effect: AlienEffect<T, Args, true>,
    target: T,
    args?: Args
  ): typeof effect

  /** @internal */
  runOnceAsync(
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

  protected _runEffect(effect: AlienEffect) {
    runEffect(effect, this)
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
export function createEffect<
  Effect extends
    | AlienEffect<void, [], false>
    | AlienBoundEffect<any, any, false>
>(
  effect: Effect,
  context?: AlienEffects,
  flags?: EffectFlags.Once
): Disposable<typeof effect>

export function createEffect<
  Effect extends AlienEffect<void, [], true> | AlienBoundEffect<any, any, true>
>(
  effect: Effect,
  context: AlienEffects | undefined,
  flags: EffectFlags.Async
): Disposable<typeof effect>

export function createEffect(
  effect: AlienEffect<void, [], boolean> | AlienBoundEffect<any, any, boolean>,
  context = lastValue(currentEffects),
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

export const createOnceEffect = <
  Effect extends
    | AlienEffect<void, [], false>
    | AlienBoundEffect<any, any, false>
>(
  effect: Effect,
  context?: AlienEffects
): Disposable<Effect> => createEffect(effect, context, EffectFlags.Once)

export const createAsyncEffect = <
  Effect extends AlienEffect<void, [], true> | AlienBoundEffect<any, any, true>
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
  enable: (...args: Args) => EffectResult
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
  const context = lastValue(currentEffects)
  return context?.currentEffect
}
