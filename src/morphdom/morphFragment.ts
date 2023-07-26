import { unmount } from '../functions/unmount'
import { AlienComponent } from '../internal/component'
import { isElement, isNode } from '../internal/duck'
import { toChildNodes } from '../internal/fragment'
import { updateParentFragment } from '../internal/parentFragment'
import {
  kAlienElementKey,
  kAlienFragment,
  kAlienManualUpdates,
} from '../internal/symbols'
import { DeferredNode, isDeferredNode } from '../jsx-dom/node'
import { ResolvedChild } from '../jsx-dom/resolveChildren'
import { morph } from './morph'

export function morphFragment(
  fragment: DocumentFragment,
  newFragment: DeferredNode,
  component?: AlienComponent | null
) {
  const isManuallyUpdated = kAlienManualUpdates.in(newFragment)
  const newNodes = newFragment.children as ResolvedChild[]
  const newKeys = newNodes.map(kAlienElementKey.get)
  const oldNodes = toChildNodes(fragment)
  const oldKeys = oldNodes.map(kAlienElementKey.get)

  let prevChild: ChildNode | undefined

  newKeys.forEach((newKey, newIndex) => {
    let oldNode: ChildNode | undefined

    // When the root fragment is a <ManualUpdates> element, skip reuse
    // of old nodes and prefer the latest nodes instead.
    if (!isManuallyUpdated && newKey !== undefined) {
      const oldIndex = oldKeys.indexOf(newKey)
      if (oldIndex !== -1) {
        oldNode = oldNodes[oldIndex]

        const newNode = newNodes[newIndex]
        if (isElement(oldNode) && isDeferredNode(newNode)) {
          morph(oldNode, newNode, component)
        }
      }
    }

    if (prevChild) {
      const node = oldNode || newNodes[newIndex]
      if (!isNode(node)) {
        throw Error('not yet supported')
      }
      prevChild.after(node)
      prevChild = node
    } else {
      // The first node is always the placeholder comment node where the
      // component effects are attached.
      prevChild = oldNode = oldNodes[0]
    }

    if (oldNode) {
      newNodes[newIndex] = oldNode
    }
  })

  for (const oldNode of oldNodes) {
    // If the old node is not in the new nodes, remove it. We check if
    // the old node still exists as a direct child of the fragment or as
    // a deep descendant, so nodes can be manually moved to a new parent
    // without being recreated from scratch (useful for wrapping and
    // unwrapping purposes).
    if (
      oldNode.isConnected &&
      // TODO: update this check
      newNodes.every(newNode => !isNode(newNode) || !newNode.contains(oldNode))
    ) {
      unmount(oldNode)
    }
  }

  // TODO: stop casting to any
  kAlienFragment(fragment, newNodes as any)
  updateParentFragment(fragment, oldNodes, newNodes as any)

  return fragment
}
