import { markPureComponent } from '../functions/markPureComponent'
import { isFragment, isNode } from '../internal/duck'
import { FragmentKeys } from '../internal/fragment'
import { kAlienFragmentKeys } from '../internal/symbols'
import {
  createFragmentNode,
  deferComponentNode,
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

  let isDeferred: boolean | undefined

  const childKeys: FragmentKeys = [undefined]
  const children = resolveChildren(
    props.children,
    undefined,
    undefined,
    (childNode, childKey) => {
      isDeferred ||= isDeferredNode(childNode)
      childKeys.push(childKey)
    }
  )

  if (isDeferred) {
    const fragment = deferComponentNode(Fragment, null, children)
    kAlienFragmentKeys(fragment, childKeys)
    return fragment
  }

  return createFragmentNode(children, childKeys)
}

markPureComponent(Fragment)
