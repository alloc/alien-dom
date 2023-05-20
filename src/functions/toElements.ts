import type { JSX } from '../types'
import type { DefaultElement } from '../internal/types'
import { kAlienPlaceholder } from '../internal/symbols'
import { toChildNodes } from '../internal/fragment'
import { isFragment, isElement } from '../internal/duck'

export function toElements(element: JSX.ElementOption): DefaultElement[] {
  if (!element) {
    return []
  }
  if (isFragment(element)) {
    const childElements: DefaultElement[] = []
    const childNodes = toChildNodes(element as any)
    childNodes.forEach(child => {
      if (isElement(child)) {
        childElements.push(
          kAlienPlaceholder(child) || (child as DefaultElement)
        )
      }
    })
    return childElements
  }
  return [kAlienPlaceholder(element) || element]
}
