import type { JSX } from '../types'
import type { AnyElement } from '../internal/types'
import { kAlienPlaceholder } from '../internal/symbols'
import { toChildNodes } from '../internal/fragment'
import { isFragment, isElement } from '../internal/duck'

export function toElements(element: JSX.ElementOption): AnyElement[] {
  if (!element) {
    return []
  }
  if (isFragment(element)) {
    const childElements: AnyElement[] = []
    const childNodes = toChildNodes(element as any)
    childNodes.forEach(child => {
      if (isElement(child)) {
        childElements.push(kAlienPlaceholder(child) || (child as AnyElement))
      }
    })
    return childElements
  }
  return [kAlienPlaceholder(element) || element]
}
