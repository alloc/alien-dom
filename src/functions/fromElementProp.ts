import type { JSX } from '../types/jsx'
import { fromElementThunk } from '../internal/fromElementThunk'

type ElementResult = JSX.Element | Comment | false | null | undefined

/**
 * Coerce a possible element thunk into an element (or a falsy value),
 * while ensuring the thunk isn't executed more than once in its
 * lifetime.
 *
 * ⚠️ This can return a `Comment` node if the given JSX element was
 * declared as a fragment (since every JSX fragment's first child is a
 * comment node) or a composite element (but only if its component
 * returns null or it threw an error during a hot update).
 */
export function fromElementProp(element: JSX.ElementProp): ElementResult

export function fromElementProp(
  element: JSX.ElementsProp
): ElementResult | ElementResult[]

export function fromElementProp(
  element: JSX.Children
): Exclude<JSX.Children, () => JSX.Children>

export function fromElementProp(element: JSX.Children) {
  if (typeof element === 'function') {
    return fromElementThunk(element)
  }
  return element
}
