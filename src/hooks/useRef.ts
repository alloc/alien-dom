import { Ref, peek, ref } from '../core/observable'
import { expectCurrentComponent } from '../internal/global'
import { useDepsArray } from './useDepsArray'

/**
 * Create an observable ref that persists between renders. Unlike the `useMemo`
 * hook, the ref is not recreated when the component is hot-reloaded.
 *
 * You may destructure the ref into a `[value, setValue]` tuple.
 *
 * 🪝 This hook adds 2 to the hook offset.
 */
export function useRef<T>(): Ref<T | undefined> &
  [value: T | undefined, set: Ref<T | undefined>[1]]

export function useRef<T>(
  init: T | (() => T)
): Ref<T> & [value: T, set: Ref<T>[1]]

export function useRef<T>(
  init: T | (() => T),
  deps: readonly any[]
): Ref<T> & [value: T, set: Ref<T>[1]]

export function useRef<T>(
  init?: T | (() => T),
  deps?: readonly any[]
): Ref<any> {
  const component = expectCurrentComponent()
  const index = component.nextHookIndex++
  if (useDepsArray(deps)) {
    return (component.hooks[index] = ref(
      init instanceof Function ? peek(init) : init
    ))
  }
  return component.hooks[index]
}
