import { isElement, isFragment } from '../internal/duck'
import { kAlienFragmentNodes } from '../internal/symbols'
import type { DefaultElement } from '../internal/types'
import { isShadowRoot } from '../jsx-dom/node'
import type { JSX } from '../types'

export function toElements<Element extends DefaultElement>(
  node: JSX.ElementOption
): Element[] {
  if (!node || isShadowRoot(node)) {
    return []
  }
  if (isFragment(node)) {
    const childElements: Element[] = []
    for (const child of kAlienFragmentNodes(node) ||
      Array.from(node.childNodes)) {
      if (child && isElement(child)) {
        childElements.push(child as Element)
      }
    }
    return childElements
  }
  return [node as Element]
}
