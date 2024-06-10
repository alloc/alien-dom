import { isFunction, isPlainObject } from '@alloc/is'
import { peek } from '../core/observable'
import { makeObjectObservable, type Observable } from '../functions/observable'
import { expectCurrentComponent } from '../internal/global'
import { useDepsArray } from './useDepsArray'

/**
 * Create a plain object with observable properties.
 *
 * 🪝 This hook adds 2 to the hook offset.
 */
export function useRefs<T extends object>(
  init: T | (() => T),
  deps: readonly any[] = []
): Observable<T> {
  const component = expectCurrentComponent()
  const index = component.nextHookIndex++
  if (useDepsArray(deps)) {
    const object = isFunction(init) ? peek(init) : init
    if (DEV && !isPlainObject(object)) {
      throw Error('useRefs only accepts plain objects')
    }
    return (component.hooks[index] = makeObjectObservable(object))
  }
  return component.hooks[index]
}
