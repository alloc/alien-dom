import { isFunction } from '@alloc/is'
import { peek } from '../core/observable'
import { createObservableState, type Observable } from '../internal/createRefs'
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
export function useRefs<T extends object>(
  init: T | (() => T),
  deps?: readonly any[]
): Observable<T> {
  const component = expectCurrentComponent()
  const index = component.nextHookIndex++
  if (useDepsArray(deps)) {
    return (component.hooks[index] = createObservableState(
      isFunction(init) ? peek(init) : init
    ))
  }
  return component.hooks[index]
}
