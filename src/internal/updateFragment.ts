import type { AnyElement } from './types'
import {
  kAlienFragment,
  kAlienEffects,
  kAlienElementKey,
  kAlienManualUpdates,
} from './symbols'
import { moveEffects } from './moveEffects'
import { recursiveMorph } from './recursiveMorph'
import { kAlienParentFragment } from './symbols'
import { toChildNodes } from './fragment'
import { ElementRefs } from './component'

export function updateFragment(
  fragment: DocumentFragment,
  newFragment: DocumentFragment,
  newRefs?: ElementRefs | null
) {
  const isManuallyUpdated = kAlienManualUpdates.in(newFragment)
  const newNodes = Array.from(newFragment.childNodes)
  const newKeys = newNodes.map(kAlienElementKey.get)
  const oldNodes = toChildNodes(fragment)
  const oldKeys = oldNodes.map(kAlienElementKey.get)

  let prevChild: ChildNode | undefined
  let elementMap: Map<AnyElement, AnyElement> | undefined

  newKeys.forEach((newKey, newIndex) => {
    let oldNode: ChildNode | undefined
    // When the root fragment is a <ManualUpdates> element, skip reuse
    // of old nodes and prefer the latest nodes instead.
    if (!isManuallyUpdated && newKey !== undefined) {
      const oldIndex = oldKeys.indexOf(newKey)
      if (oldIndex !== -1) {
        oldNode = oldNodes[oldIndex]
        recursiveMorph(
          oldNode as Element,
          newNodes[newIndex] as Element,
          newRefs,
          (elementMap ||= new Map()),
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
      newNodes.every(newNode => !newNode.contains(oldNode))
    ) {
      oldNode.remove()
    }
  }

  kAlienFragment(fragment, newNodes)
  updateParentFragment(fragment, oldNodes, newNodes)

  if (elementMap) {
    for (const [newElement, oldElement] of elementMap) {
      const oldEffects = kAlienEffects(oldElement)
      const newEffects = kAlienEffects(newElement)
      if (newEffects) {
        moveEffects(newEffects, oldElement, elementMap)
      }
      oldEffects?.disable()
    }
  }

  return fragment
}

export function updateParentFragment(
  fragment: DocumentFragment,
  oldNodes: ChildNode[],
  newNodes: ChildNode[]
) {
  const parentFragment = kAlienParentFragment(fragment)
  if (parentFragment) {
    spliceFragment(parentFragment, oldNodes, newNodes)
  }
}

function spliceFragment(
  fragment: DocumentFragment,
  oldSlice: ChildNode[],
  newSlice: ChildNode[]
) {
  const oldNodes = fragment.childNodes.length
    ? Array.from(fragment.childNodes)
    : kAlienFragment(fragment)!

  const offset = oldNodes.indexOf(oldSlice[0])
  if (offset < 0) {
    return
  }

  const newNodes = [...oldNodes]
  newNodes.splice(offset, oldSlice.length, ...newSlice)

  if (fragment.childNodes.length) {
    fragment.replaceChildren(...newNodes)
  } else {
    kAlienFragment(fragment, newNodes)
    updateParentFragment(fragment, oldNodes, newNodes)
  }
}
