import type { AnyElement } from './types'
import {
  kAlienFragment,
  kAlienHooks,
  kAlienElementKey,
  kAlienManualUpdates,
} from '../symbols'
import { retargetHooks } from './retargetHooks'
import { recursiveMorph } from './recursiveMorph'

export function updateFragment(
  fragment: DocumentFragment,
  newFragment: DocumentFragment,
  newRefs?: Map<any, AnyElement> | null
) {
  const oldNodes = kAlienFragment(fragment)!.filter(
    // In the event that any of the fragment's child nodes are moved to
    // a new parent than the comment node (e.g. the first child), we
    // should avoid updating the moved nodes.
    (oldNode, index, oldNodes) =>
      oldNode.isConnected &&
      (index === 0 || oldNode.parentNode === oldNodes[0].parentNode)
  )
  const oldKeys = oldNodes.map(kAlienElementKey.get)
  const newNodes: ChildNode[] = Array.from<any>(newFragment.childNodes)
  const newKeys = newNodes.map(kAlienElementKey.get)

  const elementMap = new Map<AnyElement, AnyElement>()
  const isManualUpdate = kAlienManualUpdates.in(newFragment)

  let prevChild: ChildNode | undefined
  newKeys.forEach((newKey, newIndex) => {
    let oldNode: ChildNode | undefined
    // When the root fragment is a <ManualUpdates> element, skip reuse
    // of old nodes and prefer the latest nodes instead.
    if (!isManualUpdate && newKey !== undefined) {
      const oldIndex = oldKeys.indexOf(newKey)
      if (oldIndex !== -1) {
        oldNode = oldNodes[oldIndex]
        recursiveMorph(
          oldNode as Element,
          newNodes[newIndex] as Element,
          newRefs,
          elementMap,
          true /* isFragment */
        )
      }
    }
    if (prevChild) {
      const node = oldNode || newNodes[newIndex]
      prevChild.after(node)
      prevChild = node
    } else {
      // The first node is always the placeholder comment node where the
      // component hooks are attached.
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
      newNodes.every(newNode => !newNode.contains(oldNode))
    ) {
      oldNode.remove()
    }
  }

  kAlienFragment(fragment, newNodes)

  for (const [newElement, oldElement] of elementMap) {
    const oldHooks = kAlienHooks(oldElement)
    const newHooks = kAlienHooks(newElement)
    if (newHooks) {
      retargetHooks(newHooks, oldElement, elementMap)
    }
    oldHooks?.disable()
  }
}
