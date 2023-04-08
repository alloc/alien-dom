import { computed } from '@preact/signals-core'
import { JSX } from './types/jsx'
import { kAlienThunkResult, kAlienElementKey, kAlienHooks } from './symbols'
import { currentComponent } from './global'
import { isElement } from './jsx-dom/util'
import { DefaultElement } from './internal/types'
import { AlienHooks } from './hooks'

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
export function fromElementThunk(thunk: () => JSX.Children) {
  if (thunk.hasOwnProperty(kAlienThunkResult)) {
    return (thunk as any)[kAlienThunkResult]
  }

  const result = computed(thunk)

  // By caching the element here, we can reuse a mounted element even if
  // a parent component overwrites its element key, which can happen if
  // the current component returns it as the root element.
  let element = result.value

  Object.defineProperty(thunk, kAlienThunkResult, {
    get() {
      let newElement = result.value

      // TODO: support more than single element nodes
      const scope = currentComponent.get()
      if (scope && isElement(newElement)) {
        const key = (newElement as any)[kAlienElementKey]
        if (key !== undefined) {
          if (element !== newElement) {
            if (element) {
              newElement = element
            } else {
              element = newElement
            }
          } else {
            // If the element is unchanged, we need to disable the old
            // hooks before new hooks are added.
            const hooks: AlienHooks = (element as any)[kAlienHooks]
            hooks?.setElement(null)
          }

          // We have to set `newElements` here or else we'll confuse the
          // self-updating component into thinking it didn't create this
          // element (i.e. a child component did).
          scope.newElements!.set(key, newElement as DefaultElement)

          // We have to call `setRef` to emulate a JSX element being
          // constructed.
          scope.setRef(key, newElement as DefaultElement)
        }
      }

      return newElement
    },
  })

  return element
}
