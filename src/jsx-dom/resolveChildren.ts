import { isFunction } from '@alloc/is'
import { AlienContextMap, getContext } from '../internal/context'
import { isArrayLike, isElement, isFragment, isNode } from '../internal/duck'
import { fromElementThunk } from '../internal/fromElementThunk'
import { kAlienElementKey, kAlienFragmentNodes } from '../internal/symbols'
import { Fragment } from '../jsx-dom/jsx-runtime'
import { isRef } from '../observable'
import type { JSX } from '../types/jsx'
import {
  AlienNode,
  DeferredNode,
  createTextNode,
  isDeferredNode,
  isShadowRoot,
} from './node'
import { noop } from './util'

export type ResolvedChild = ChildNode | AlienNode | null

/**
 * Coerce a `JSX.Children` value into a flat array of nodes.
 *
 * Positional keys are assigned to elements and deferred nodes.
 */
export function resolveChildren(
  child: JSX.ChildrenProp,
  key?: string,
  context = new Map(getContext()) as AlienContextMap,
  onChildNode: (node: ResolvedChild, key?: string) => void = noop,
  nodes: ResolvedChild[] = []
): ResolvedChild[] {
  let node: ResolvedChild | undefined
  let children: ArrayLike<JSX.ChildrenProp | Node> | undefined

  if (child) {
    if (isNode(child)) {
      if (isFragment(child)) {
        children = kAlienFragmentNodes(child)
        if (!children) {
          // The fragment wasn't created through JSX, so let's avoid setting
          // element keys and resolveChildren recursion.
          child.childNodes.forEach(child => {
            nodes.push(child)
            onChildNode(child)
          })
        }
      } else {
        node = child

        if (isElement(child) && hasReplaceableKey(child)) {
          kAlienElementKey(child, key)
        }
      }
    } else if (isDeferredNode(child)) {
      if (child.tag === Fragment) {
        children = child.children as ResolvedChild[]
      } else {
        node = child
        child.context = context

        if (hasReplaceableKey(child)) {
          kAlienElementKey(child, key)
        }
      }
    } else if (isFunction(child)) {
      child = fromElementThunk(child)
      resolveChildren(child, key, context, onChildNode, nodes)
    } else if (isArrayLike(child)) {
      children = child
    } else if (isRef(child)) {
      resolveChildren(child.peek(), key, context, onChildNode, nodes)
    } else if (isShadowRoot(child)) {
      node = child
    } else {
      node = createTextNode(child)
    }
  } else if (child === 0 || child === '') {
    node = createTextNode(child)
  } else {
    node = null
  }

  if (node !== undefined) {
    nodes.push(node)
    onChildNode(node, (node && kAlienElementKey(node)) ?? key)
  }

  if (children) {
    const childrenKey = key ?? ''
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as JSX.ChildrenProp
      const childKey = childrenKey + '*' + i
      resolveChildren(child, childKey, context, onChildNode, nodes)
    }
  }

  return nodes
}

function hasReplaceableKey(node: ChildNode | DeferredNode) {
  const key = kAlienElementKey(node)
  return key == null || (key as string)[0] === '*'
}
