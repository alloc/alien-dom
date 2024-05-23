import { isFunction } from '@alloc/is'
import { Falsy } from '@alloc/types'
import { ReadonlyRef, observe } from '../core/observable'
import { useCallbackProp } from './useCallbackProp'
import { EffectCallback, useEffect, useWrappedEffect } from './useEffect'
import { useHookOffset } from './useHookOffset'

/**
 * Observe a single ref.
 *
 * 🪝 This hook adds 2 to the hook offset.
 */
export function useObserver<T>(
  ref: ReadonlyRef<T> | Falsy,
  onChange: (value: T, oldValue: T) => void
): void

/**
 * Observe any refs accessed by the effect.
 *
 * 🪝 This hook adds 2 to the hook offset.
 */
export function useObserver(
  effect: EffectCallback | Falsy,
  deps: readonly any[]
): void

/** @internal */
export function useObserver(
  arg1: ReadonlyRef | EffectCallback | Falsy,
  arg2: ((value: any, oldValue: any) => void) | readonly any[]
) {
  if (isFunction(arg1)) {
    const effect = arg1,
      deps = arg2 as readonly any[]
    useHookOffset(1)
    useWrappedEffect(effect, effect => observe(effect).destructor, deps)
  } else if (arg1) {
    const ref = arg1 as ReadonlyRef<any>,
      onChange = useCallbackProp(arg2 as (value: any, oldValue: any) => void)
    useEffect(() => {
      const initialValue = ref.value
      onChange(initialValue, initialValue)
      return observe(ref, onChange).destructor
    }, [ref])
  } else {
    useHookOffset(2)
  }
}
