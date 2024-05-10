import { isFragment, isNode } from '../internal/duck'
import { wrapWithFragment } from '../internal/fragment'
import { DeferredCompositeNode, isDeferredNode } from '../jsx-dom/node'
import type { JSX } from '../types'

export function Fragment(props: { children: JSX.ChildrenProp }): JSX.Element {
  return createFragment(props.children) as any
}

export function createFragment(children: JSX.ChildrenProp) {
  if (isDeferredNode(children)) {
    if (children.tag === Fragment) {
      return children as DeferredCompositeNode
    }
  } else if (isNode(children) && isFragment(children)) {
    return children
  }
  return wrapWithFragment(children)
}
