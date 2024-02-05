import { isFunction } from '@alloc/is'
import { Falsy } from '@alloc/types'
import { ReadonlyRef, observe } from '../observable'
import { EffectCallback, useEffect } from './useEffect'
import { useHookOffset } from './useHookOffset'

/** Observe a single ref. */
export function useObserver<T>(
  ref: ReadonlyRef<T> | Falsy,
  onChange: (value: T, oldValue: T) => void,
  deps: readonly any[]
): void

/** Observe any refs accessed by the effect. */
export function useObserver(effect: EffectCallback, deps: readonly any[]): void

/** @internal */
export function useObserver(
  arg1: ReadonlyRef | EffectCallback | Falsy,
  arg2: ((value: any, oldValue: any) => void) | readonly any[],
  arg3?: readonly any[]
) {
  if (isFunction(arg1)) {
    const effect = arg1,
      deps = arg2 as readonly any[]
    useEffect(() => observe(effect).destructor, deps)
  } else {
    const ref = arg1,
      onChange = arg2 as (value: any, oldValue: any) => void,
      deps = arg3!

    if (ref) {
      useEffect(() => {
        const initialValue = ref.value
        onChange(initialValue, initialValue)
        return observe(ref, onChange).destructor
      }, deps)
    } else {
      useHookOffset(2)
    }
  }
}
