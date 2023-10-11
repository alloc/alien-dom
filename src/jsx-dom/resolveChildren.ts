import { isFunction } from '@alloc/is'
import { AlienContextMap, getContext } from '../internal/context'
import { isArrayLike, isFragment, isNode } from '../internal/duck'
import { fromElementThunk } from '../internal/fromElementThunk'
import {
  kAlienElementKey,
  kAlienElementPosition,
  kAlienFragmentNodes,
} from '../internal/symbols'
import { Fragment } from '../jsx-dom/jsx-runtime'
import { isRef } from '../observable'
import type { JSX } from '../types/jsx'
import { AlienNode, createTextNode, isDeferredNode, isShadowRoot } from './node'
import { noop } from './util'

export type ResolvedChild = ChildNode | AlienNode | null

/**
 * Coerce a `JSX.Children` value into a flat array of nodes.
 *
 * Positional keys are assigned to elements and deferred nodes.
 */
export function resolveChildren(
  child: JSX.ChildrenProp,
  position?: string,
  context = new Map(getContext()) as AlienContextMap,
  onChildNode: (node: ResolvedChild, key?: string) => void = noop,
  nodes: ResolvedChild[] = []
): ResolvedChild[] {
  /**
   * Either a deferred node or a DOM node, but never a fragment. Element thunks
   * are resolved into one of the two, and primitive values become `Text` nodes.
   */
  let node: ResolvedChild | undefined

  /**
   * This is defined when `child` is a fragment or a node array, unless a
   * fragment was created with native API directly (not JSX).
   *
   * The children are resolved recursively with their own positions (relative to
   * the fragment `position` string).
   */
  let children: ArrayLike<JSX.ChildrenProp | Node> | undefined

  if (child) {
    if (isNode(child)) {
      if (isFragment(child)) {
        kAlienElementPosition(child, position)
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
      }
    } else if (isDeferredNode(child)) {
      if (child.tag === Fragment) {
        kAlienElementPosition(child, position)
        children = child.children as ResolvedChild[]
      } else {
        node = child
        child.context = context
      }
    } else if (isFunction(child)) {
      child = fromElementThunk(child)
      resolveChildren(child, position, context, onChildNode, nodes)
    } else if (isArrayLike(child)) {
      children = child
    } else if (isRef(child)) {
      resolveChildren(child.peek(), position, context, onChildNode, nodes)
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

  // If not a fragment...
  if (node !== undefined) {
    if (node !== null) {
      kAlienElementPosition(node, position)
    }
    nodes.push(node)
    onChildNode(node, (node && kAlienElementKey(node)) ?? position)
  }

  if (children) {
    const parentPosition = position ?? ''
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as JSX.ChildrenProp
      const childPosition = parentPosition + '*' + i
      resolveChildren(child, childPosition, context, onChildNode, nodes)
    }
  }

  return nodes
}
