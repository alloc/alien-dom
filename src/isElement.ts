import { kFragmentNodeType, kElementNodeType } from './internal/constants'
import type { JSX } from './types/jsx'

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
