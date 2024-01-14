import { isFragment, isNode } from '../internal/duck'
import { wrapWithFragment } from '../internal/fragment'
import { isDeferredNode } from '../jsx-dom/node'
import type { JSX } from '../types'

export function Fragment(props: { children: JSX.ChildrenProp }) {
  if (isDeferredNode(props.children)) {
    if (props.children.tag === Fragment) {
      return props.children
    }
  } else if (isNode(props.children) && isFragment(props.children)) {
    return props.children
  }
  return wrapWithFragment(props.children)
}
