import { Fragment } from '../components/Fragment'
import {
  DeferredCompositeNode,
  createFragmentNode,
  deferCompositeNode,
  isDeferredNode,
} from '../jsx-dom/node'
import {
  ResolvedChild,
  UnresolvedChild,
  resolveChildren,
} from '../jsx-dom/resolveChildren'
import type { JSX } from '../types/jsx'
import { ContextMap } from './context'
import { currentNodeStore } from './global'
import {
  getElementKey,
  getElementPosition,
  getFragmentNodes,
  getParentFragment,
  setFragmentKeys,
  setFragmentNodes,
} from './symbols'
import { at, lastValue } from './util'

export type FragmentNodes = [ChildNode, ...(ChildNode | undefined)[]]
export type FragmentKeys = (JSX.ElementKey | undefined)[]

export function wrapWithFragment(
  childrenProp: UnresolvedChild,
  isDeferred: false,
  context?: ContextMap
): DocumentFragment

export function wrapWithFragment(
  childrenProp: UnresolvedChild,
  isDeferred: true,
  context?: ContextMap
): DeferredCompositeNode

export function wrapWithFragment(
  childrenProp: UnresolvedChild,
  isDeferred?: boolean,
  context?: ContextMap
): DocumentFragment | DeferredCompositeNode

export function wrapWithFragment(
  childrenProp: UnresolvedChild,
  isDeferred?: boolean,
  context?: ContextMap
) {
  const childKeys: FragmentKeys = [undefined]
  const children = resolveChildren(
    childrenProp,
    undefined,
    context,
    (childNode, childKey) => {
      if (isDeferred == null && isDeferredChild(childNode)) {
        isDeferred = true
      }
      childKeys.push(childKey)
    }
  )
  if (isDeferred) {
    const node = deferCompositeNode(Fragment, null, children)
    setFragmentKeys(node, childKeys)
    return node
  }
  return createFragmentNode(children, childKeys)
}

function isDeferredChild(child: ResolvedChild) {
  if (isDeferredNode(child)) {
    return true
  }
  if (child != null) {
    const key = getElementKey(child)
    if (key != null) {
      const nodeStore = lastValue(currentNodeStore)
      if (nodeStore) {
        return nodeStore.getNodeUpdateForKey(key) != null
      }
    }
  }
  return false
}

export function updateParentFragment(
  fragment: DocumentFragment,
  oldNodes: (ChildNode | undefined)[],
  newNodes: (ChildNode | undefined)[]
) {
  const parentFragment = getParentFragment(fragment)
  if (parentFragment) {
    spliceFragment(parentFragment, oldNodes, newNodes)
  }
}

function spliceFragment(
  fragment: DocumentFragment,
  oldSlice: (ChildNode | undefined)[],
  newSlice: (ChildNode | undefined)[]
) {
  const oldNodes = getFragmentNodes(fragment)!
  const offset = oldNodes.indexOf(oldSlice[0])
  if (offset < 0) {
    return
  }

  const newNodes = [...oldNodes] as FragmentNodes
  newNodes.splice(offset, oldSlice.length, ...newSlice)

  const parentPosition = getElementPosition(fragment) ?? ''
  const newKeys = newNodes.map(
    (node, i) => node && (getElementKey(node) || parentPosition + '*' + i)
  )
  setFragmentKeys(fragment, newKeys)

  if (fragment.childNodes.length) {
    const replacements = newNodes.filter(Boolean) as ChildNode[]
    fragment.replaceChildren(...replacements)
  } else {
    setFragmentNodes(fragment, newNodes)
    updateParentFragment(fragment, oldNodes, newNodes)
  }
}

export function endOfFragment(fragment: DocumentFragment) {
  const childNodes = getFragmentNodes(fragment)!
  for (let i = -1; i >= -childNodes.length; i--) {
    const childNode = at(childNodes, i)
    if (childNode) {
      return childNode
    }
  }
}

export function fragmentToChildNodes<T extends ChildNode = ChildNode>(
  fragment: DocumentFragment,
  match: (child: ChildNode | undefined) => child is T = Boolean as any
) {
  return getFragmentNodes(fragment)!.filter(match)
}
