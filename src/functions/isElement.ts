import { kFragmentNodeType, kElementNodeType } from '../internal/constants'
import type { JSX } from '../types/jsx'
import type { AlienElementList } from '../element'
import type { AnyElement, DefaultElement } from '../internal/types'

/**
 * ⚠️ This returns true for functions due to the possibility of element
 * thunking.
 */
export function isElement(value: any): value is JSX.Element {
  if (value === null || value === undefined) {
    return false
  }
  if (typeof value === 'function') {
    // Until we change how element evaluation is deferred, we have to
    // assume functions are element thunks.
    return true
  }
  const { nodeType } = value as { nodeType?: number }
  return nodeType === kElementNodeType || nodeType === kFragmentNodeType
}

export function isAlienElement<Element extends AnyElement = DefaultElement>(
  arg: any
): arg is Element | AlienElementList<Element> {
  return arg instanceof Element || arg instanceof NodeList
}
