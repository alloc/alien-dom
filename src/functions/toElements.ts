import { isElement, isFragment } from '../internal/duck'
import { getFragmentNodes } from '../internal/fragment'
import { kAlienPlaceholder } from '../internal/symbols'
import type { DefaultElement } from '../internal/types'
import { isShadowRoot } from '../jsx-dom/node'
import type { JSX } from '../types'

export function toElements<Element extends DefaultElement>(
  element: JSX.ElementOption
): Element[] {
  if (!element || isShadowRoot(element)) {
    return []
  }
  if (isFragment(element)) {
    const childElements: Element[] = []
    for (const child of getFragmentNodes(element)) {
      if (isElement(child)) {
        childElements.push(kAlienPlaceholder(child) || (child as Element))
      }
    }
    return childElements
  }
  return [kAlienPlaceholder(element) || (element as Element)]
}
