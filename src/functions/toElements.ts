import { isElement, isFragment } from '../internal/duck'
import { toChildNodes } from '../internal/fragment'
import { kAlienPlaceholder } from '../internal/symbols'
import type { DefaultElement } from '../internal/types'
import { isShadowRoot } from '../jsx-dom/shadow'
import type { JSX } from '../types'

export function toElements(element: JSX.ElementOption): DefaultElement[] {
  if (!element || isShadowRoot(element)) {
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
