import type { ChildrenFragment } from '../hooks/useChildren'
import { isElement, isFragment } from '../internal/duck'
import { kAlienFragmentNodes } from '../internal/symbols'
import type { HTMLOrSVGElement } from '../internal/types'
import { AlienNode, isShadowRoot } from '../jsx-dom/node'
import type { JSX } from '../types'

export function toElements<Element extends HTMLOrSVGElement>(
  node: Exclude<JSX.ElementLike, AlienNode | ChildrenFragment>
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
