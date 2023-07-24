import { markPureComponent } from '../functions/markPureComponent'
import { isFragment, isNode } from '../internal/duck'
import {
  createDeferredNode,
  createFragmentNode,
  isDeferredNode,
} from '../jsx-dom/node'
import { resolveChildren } from '../jsx-dom/resolveChildren'
import type { JSX } from '../types'

export function Fragment(props: { children: JSX.ChildrenProp }) {
  if (isDeferredNode(props.children)) {
    if (props.children.tag === Fragment) {
      return props.children
    }
  } else if (isNode(props.children) && isFragment(props.children)) {
    return props.children
  }
  const children = resolveChildren(props.children)
  if (children.some(isDeferredNode)) {
    return createDeferredNode(Fragment, null, children)
  }
  return createFragmentNode(children)
}

markPureComponent(Fragment)
