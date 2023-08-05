import { Fragment } from '../jsx-dom/jsx-runtime'
import { createFragmentNode, deferComponentNode } from '../jsx-dom/node'
import { resolveChildren } from '../jsx-dom/resolveChildren'
import { document } from '../platform'
import type { JSX } from '../types/jsx'
import { AlienContextMap } from './context'
import {
  kAlienElementKey,
  kAlienFragmentKeys,
  kAlienFragmentNodes,
  kAlienParentFragment,
} from './symbols'

export type FragmentNodes = [Comment, ...(ChildNode | undefined)[]]
export type FragmentKeys = (JSX.ElementKey | undefined)[]

export function wrapWithFragment(
  wrappedChild: JSX.ChildrenProp,
  context: AlienContextMap,
  isDeferred?: boolean
) {
  const childKeys: FragmentKeys = [undefined]
  const children = resolveChildren(
    wrappedChild,
    undefined,
    context,
    (_, childKey) => {
      childKeys.push(childKey)
    }
  )
  if (isDeferred) {
    const node = deferComponentNode(Fragment, null, children)
    kAlienFragmentKeys(node, childKeys)
    return node
  }
  return createFragmentNode(children, childKeys)
}

export function prependFragmentHeader(
  fragment: DocumentFragment,
  comment: string
) {
  const header = document.createComment(comment)
  fragment.prepend(header)

  const childNodes = kAlienFragmentNodes(fragment)!
  childNodes[0] = header
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

  // FIXME: this seems wrong, since the parent fragment should apply its own
  // positional keys when being updated
  const newKeys = newNodes.map(node => node && kAlienElementKey(node))
  kAlienFragmentKeys(fragment, newKeys)

  if (fragment.childNodes.length) {
    const replacements = newNodes.filter(Boolean) as ChildNode[]
    fragment.replaceChildren(...replacements)
  } else {
    kAlienFragmentNodes(fragment, newNodes)
    updateParentFragment(fragment, oldNodes, newNodes)
  }
}
