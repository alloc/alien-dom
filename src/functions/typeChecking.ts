import { isNode } from '../internal/duck'
import type { JSX } from '../types/jsx'

/**
 * ⚠️ This returns true for functions due to the possibility of element
 * thunking.
 */
export function isJSXChild(
  value: any
): value is JSX.Element | DocumentFragment | Comment {
  if (value === null || value === undefined) {
    return false
  }
  if (typeof value === 'function') {
    // Until we change how element evaluation is deferred, we have to
    // assume functions are element thunks.
    return true
  }
  return isNode(value)
}

export {
  isComment,
  isElement,
  isFragment,
  isNode,
  isTextNode,
} from '../internal/duck'
