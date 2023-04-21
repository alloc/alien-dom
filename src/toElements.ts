import { kElementNodeType, kFragmentNodeType } from './internal/constants'
import { AnyElement } from './internal/types'
import { kAlienPlaceholder } from './symbols'
import type { JSX } from './types'

export function toElements(element: JSX.ElementOption): AnyElement[] {
  if (!element) {
    return []
  }
  if (element.nodeType === kFragmentNodeType) {
    const children: AnyElement[] = []
    element.childNodes.forEach(child => {
      if (child.nodeType === kElementNodeType) {
        children.push(kAlienPlaceholder(child) || (child as AnyElement))
      }
    })
    return children
  }
  return [kAlienPlaceholder(element) || element]
}
