import { isFunction } from '@alloc/is'
import { AlienContextMap, getContext } from '../internal/context'
import { isArrayLike, isElement, isFragment, isNode } from '../internal/duck'
import { fromElementThunk } from '../internal/fromElementThunk'
import { kAlienElementKey } from '../internal/symbols'
import { Fragment } from '../jsx-dom/jsx-runtime'
import { ReadonlyRef, isRef } from '../observable'
import type { JSX } from '../types/jsx'
import {
  AlienNode,
  DeferredNode,
  createTextNode,
  isDeferredNode,
  isShadowRoot,
} from './node'

export type ResolvedChild = ChildNode | AlienNode

/**
 * Coerce a `JSX.Children` value into a flat array of nodes.
 *
 * Positional keys are assigned to elements and deferred nodes.
 */
export function resolveChildren(
  child: JSX.Children | ReadonlyRef<JSX.Children>,
  key?: string,
  context = new Map(getContext()) as AlienContextMap,
  nodes: ResolvedChild[] = []
): ResolvedChild[] {
  let children: ArrayLike<JSX.Children | Node> | undefined

  if (child) {
    if (isNode(child)) {
      if (isFragment(child)) {
        children = child.childNodes
      } else {
        nodes.push(child)

        if (isElement(child) && hasReplaceableKey(child)) {
          kAlienElementKey(child, key)
        }
      }
    } else if (isDeferredNode(child)) {
      if (child.tag === Fragment) {
        children = child.children as ResolvedChild[]
      } else {
        nodes.push(child)
        child.context = context

        if (hasReplaceableKey(child)) {
          kAlienElementKey(child, key)
        }
      }
    } else if (isFunction(child)) {
      child = fromElementThunk(child)
      resolveChildren(child, key, context, nodes)
    } else if (isArrayLike(child)) {
      children = child
    } else if (isRef(child)) {
      resolveChildren(child.peek(), key, context, nodes)
    } else if (isShadowRoot(child)) {
      nodes.push(child)
    } else {
      nodes.push(createTextNode(child))
    }
  } else if (child === 0 || child === '') {
    nodes.push(createTextNode(child))
  }

  if (children) {
    const childrenKey = key || ''
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as JSX.Children
      resolveChildren(child, childrenKey + '*' + i, context, nodes)
    }
  }

  return nodes
}

function hasReplaceableKey(node: ChildNode | DeferredNode) {
  const key = kAlienElementKey(node)
  return key == null || (key as string)[0] === '*'
}
