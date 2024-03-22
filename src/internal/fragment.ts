import { Fragment } from '../components/Fragment'
import {
  createFragmentNode,
  deferCompositeNode,
  isDeferredNode,
} from '../jsx-dom/node'
import { ResolvedChild, resolveChildren } from '../jsx-dom/resolveChildren'
import type { JSX } from '../types/jsx'
import { AlienContextMap } from './context'
import { currentComponent } from './global'
import {
  kAlienElementKey,
  kAlienElementPosition,
  kAlienFragmentKeys,
  kAlienFragmentNodes,
  kAlienParentFragment,
} from './symbols'
import { at, lastValue } from './util'

export type FragmentNodes = [Comment, ...(ChildNode | undefined)[]]
export type FragmentKeys = (JSX.ElementKey | undefined)[]

export function wrapWithFragment(
  childrenProp: JSX.ChildrenProp,
  isDeferred?: boolean,
  context?: AlienContextMap
) {
  const childKeys: FragmentKeys = [undefined]
  const children = resolveChildren(
    childrenProp,
    undefined,
    context,
    (childNode, childKey) => {
      isDeferred ||= isDeferredChild(childNode)
      childKeys.push(childKey)
    }
  )
  if (isDeferred) {
    const node = deferCompositeNode(Fragment, null, children)
    kAlienFragmentKeys(node, childKeys)
    return node
  }
  return createFragmentNode(children, childKeys)
}

function isDeferredChild(child: ResolvedChild) {
  if (isDeferredNode(child)) {
    return true
  }
  if (child != null) {
    const key = kAlienElementKey(child)
    if (key != null) {
      const component = lastValue(currentComponent)
      if (component) {
        return component.updates.has(key)
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
  const parentFragment = kAlienParentFragment(fragment)
  if (parentFragment) {
    spliceFragment(parentFragment, oldNodes, newNodes)
  }
}

function spliceFragment(
  fragment: DocumentFragment,
  oldSlice: (ChildNode | undefined)[],
  newSlice: (ChildNode | undefined)[]
) {
  const oldNodes = kAlienFragmentNodes(fragment)!
  const offset = oldNodes.indexOf(oldSlice[0])
  if (offset < 0) {
    return
  }

  const newNodes = [...oldNodes] as FragmentNodes
  newNodes.splice(offset, oldSlice.length, ...newSlice)

  const parentPosition = kAlienElementPosition(fragment) ?? ''
  const newKeys = newNodes.map(
    (node, i) => node && (kAlienElementKey(node) || parentPosition + '*' + i)
  )
  kAlienFragmentKeys(fragment, newKeys)

  if (fragment.childNodes.length) {
    const replacements = newNodes.filter(Boolean) as ChildNode[]
    fragment.replaceChildren(...replacements)
  } else {
    kAlienFragmentNodes(fragment, newNodes)
    updateParentFragment(fragment, oldNodes, newNodes)
  }
}

export function endOfFragment(fragment: DocumentFragment) {
  const childNodes = kAlienFragmentNodes(fragment)!
  for (let i = -1; i >= -childNodes.length; i--) {
    const childNode = at(childNodes, i)
    if (childNode) {
      return childNode
    }
  }
}
