import { isFunction } from '@alloc/is'
import { ReadonlyRef, isRef } from '../core/observable'
import { isChildrenFragment } from '../hooks/useChildren'
import { ContextMap, getContext } from '../internal/context'
import { isArrayLike, isFragment, isNode } from '../internal/duck'
import { fromElementThunk } from '../internal/fromElementThunk'
import { currentNodeStore } from '../internal/global'
import {
  getElementKey,
  getFragmentNodes,
  setElementPosition,
} from '../internal/symbols'
import { lastValue, noop } from '../internal/util'
import { Fragment } from '../jsx-dom/jsx-runtime'
import type { JSX } from '../types/jsx'
import {
  AlienNode,
  DeferredChildren,
  createTextNode,
  isDeferredNode,
  isShadowRoot,
} from './node'

type Thunkable<T> = T | (() => T)

export type UnresolvedChild =
  | DeferredChildren
  | Thunkable<
      | JSX.Children
      | ReadonlyRef<JSX.Children>
      | JSX.ElementLike
      | JSX.ElementLike[]
    >

export type ResolvedChild = ChildNode | AlienNode | null

/**
 * Coerce a `JSX.Children` value into a flat array of nodes.
 *
 * Positional keys are assigned to elements and deferred nodes.
 */
export function resolveChildren(
  child: UnresolvedChild,
  position?: string,
  context = new Map(getContext()) as ContextMap,
  onChildNode: (node: ResolvedChild, key?: JSX.ElementKey) => void = noop,
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
  let children: ArrayLike<UnresolvedChild | Node> | undefined

  if (child) {
    // Note that a ChildrenFragment never has a deferred node, since its sole
    // purpose for existing is to materialize any deferred children given to it.
    if (isChildrenFragment(child)) {
      child = child.fragment
    }
    // Since fragment nodes are emptied upon first being mounted (an unavoidable
    // quirk of the DOM API), it's important to replace the fragment at this
    // point with its deferred update, since that allows us to easily enumerate
    // the resolved children of the fragment's latest render.
    else if (isNode(child) && isFragment(child)) {
      const nodeStore = lastValue(currentNodeStore)
      if (nodeStore) {
        const key = getElementKey(child)
        if (key != null) {
          child = nodeStore.getNodeUpdateForKey(key) || child
        }
      }
    }

    if (isNode(child)) {
      if (isFragment(child)) {
        setElementPosition(child, position)
        children = getFragmentNodes(child)
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
        setElementPosition(child, position)
        children = child.children as ResolvedChild[]
      } else {
        node = child
        child.context ||= context
      }
    } else if (isFunction(child)) {
      child = fromElementThunk(child, true)
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
      setElementPosition(node, position ?? '*0')
    }
    nodes.push(node)
    onChildNode(node, (node && getElementKey(node)) ?? position ?? '*0')
  }

  if (children) {
    const parentPosition = position ?? ''
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as UnresolvedChild
      const childPosition = parentPosition + '*' + i
      resolveChildren(child, childPosition, context, onChildNode, nodes)
    }
  }

  return nodes
}
