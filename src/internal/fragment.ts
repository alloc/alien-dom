import {
  kAlienElementKey,
  kAlienFragmentKeys,
  kAlienFragmentNodes,
  kAlienParentFragment,
} from './symbols'

/**
 * Prepare a fragment node for insertion into the DOM.
 */
export function prepareFragment(fragment: DocumentFragment) {
  let childNodes = kAlienFragmentNodes(fragment)
  if (!childNodes) {
    // This is the first time the fragment is being appended, so
    // cache its child nodes.
    childNodes = Array.from(fragment.childNodes)
    kAlienFragmentNodes(fragment, childNodes)
    kAlienFragmentKeys(fragment, childNodes.map(kAlienElementKey.get))
  }
  return fragment
}

export function getFragmentNodes(parent: DocumentFragment) {
  const oldNodes = kAlienFragmentNodes(parent)
  return oldNodes || Array.from(parent.childNodes)
}

export function getFragmentHeader(fragment: DocumentFragment) {
  const oldNodes = kAlienFragmentNodes(fragment)
  return oldNodes ? oldNodes[0] : fragment.firstChild!
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
    : kAlienFragmentNodes(fragment)!

  const offset = oldNodes.indexOf(oldSlice[0])
  if (offset < 0) {
    return
  }

  const newNodes = [...oldNodes]
  newNodes.splice(offset, oldSlice.length, ...newSlice)

  // FIXME: this seems wrong, since the parent fragment should apply its own
  // positional keys when being updated
  const newKeys = newNodes.map(kAlienElementKey.get)
  kAlienFragmentKeys(fragment, newKeys)

  if (fragment.childNodes.length) {
    fragment.replaceChildren(...newNodes)
  } else {
    kAlienFragmentNodes(fragment, newNodes)
    updateParentFragment(fragment, oldNodes, newNodes)
  }
}
