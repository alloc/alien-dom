import { computed } from '@preact/signals-core'
import { JSX } from './types/jsx'
import { kAlienThunkResult, kAlienElementKey } from './symbols'
import { currentComponent } from './global'
import { isElement } from './jsx-dom/util'
import { DefaultElement } from './internal/types'

/**
 * Coerce a possible element thunk into an element (or a falsy value),
 * while ensuring the thunk isn't executed more than once in its
 * lifetime.
 */
export function fromElementProp(element: JSX.ElementProp): JSX.ElementOption {
  if (typeof element === 'function') {
    return fromElementThunk(element)
  }
  return element
}

/** @internal */
export function fromElementThunk(element: () => JSX.Children) {
  if (element.hasOwnProperty(kAlienThunkResult)) {
    return (element as any)[kAlienThunkResult]
  }
  const result = computed(element)
  Object.defineProperty(element, kAlienThunkResult, {
    get() {
      let element = result.value

      // TODO: support more than single element nodes
      const scope = currentComponent.get()
      if (scope && isElement(element)) {
        const key = (element as any)[kAlienElementKey]
        if (key !== undefined) {
          const oldElement = scope.fromRef(key)
          if (oldElement !== element) {
            scope.newElements.set(key, element as DefaultElement)
          }
          if (oldElement) {
            element = oldElement
          }
          scope.setRef(key, element as DefaultElement)
        }
      }

      return element
    },
  })
  return result.value
}
