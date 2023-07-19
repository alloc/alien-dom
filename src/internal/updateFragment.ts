import { AlienComponent, ElementRefs } from './component'
import { toChildNodes } from './fragment'
import { morph, shouldMorphElement } from './morph'
import {
  kAlienElementKey,
  kAlienFragment,
  kAlienManualUpdates,
  kAlienParentFragment,
} from './symbols'

export function updateFragment(
  fragment: DocumentFragment,
  newFragment: DocumentFragment,
  newRefs?: ElementRefs | null,
  component?: AlienComponent | null
) {
  const isManuallyUpdated = kAlienManualUpdates.in(newFragment)
  const newNodes = Array.from(newFragment.childNodes)
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
        if (shouldMorphElement(oldNode as any, newNode as any, newRefs)) {
          morph(oldNode as any, newNode as any, newRefs, component)
        }
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
