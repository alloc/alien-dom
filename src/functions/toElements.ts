import type { JSX } from '../types'
import type { AnyElement } from '../internal/types'
import { kElementNodeType, kFragmentNodeType } from '../internal/constants'
import { kAlienPlaceholder } from '../symbols'
import { toChildNodes } from '../internal/fragment'

export function toElements(element: JSX.ElementOption): AnyElement[] {
  if (!element) {
    return []
  }
  if (element.nodeType === kFragmentNodeType) {
    const childElements: AnyElement[] = []
    const childNodes = toChildNodes(element as any)
    childNodes.forEach(child => {
      if (child.nodeType === kElementNodeType) {
        childElements.push(kAlienPlaceholder(child) || (child as AnyElement))
      }
    })
    return childElements
  }
  return [kAlienPlaceholder(element) || element]
}
