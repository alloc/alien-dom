import type { JSX } from '../types/jsx'
import { isNode } from '../internal/duck'

/**
 * ⚠️ This returns true for functions due to the possibility of element
 * thunking.
 */
export function isJSXChild(value: any): value is JSX.Element {
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
  isNode,
  isElement,
  isFragment,
  isTextNode,
  isComment,
} from '../internal/duck'
