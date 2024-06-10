import { peek } from '../core/observable'
import { createObservableState, type Observable } from '../internal/createRefs'
import { expectCurrentComponent } from '../internal/global'
import { useDepsArray } from './useDepsArray'

export type { Observable as Refs }

/**
 * Like `useConst` but properties are observable. Note that destructured values
 * won't be observable.
 *
 * - Properties with an `Array` value are wrapped with `ArrayRef` objects.
 * - Nested objects do *not* have observable properties.
 *
 * 🪝 This hook adds 2 to the hook offset.
 */
export function useConstRefs<T extends object, Params extends any[]>(
  init: new (...params: Params) => T,
  ...params: Params
): Observable<T>

export function useConstRefs<T extends object, Params extends any[]>(
  init: (...params: Params) => T,
  ...params: Params
): Observable<T>

export function useConstRefs<T extends object>(
  init: T,
  ...params: any[]
): Observable<T> {
  const component = expectCurrentComponent()
  const index = component.nextHookIndex++
  if (useDepsArray(params)) {
    return (component.hooks[index] = peek(createObservableState, init, params))
  }
  return component.hooks[index]
}
