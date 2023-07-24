import { AlienComponent } from './component'
import { currentMode } from './global'
import { getPlaceholder, revertAllPlaceholders } from './placeholder'
import { kAlienFragment } from './symbols'

export function toChildNodes(parent: Element | DocumentFragment) {
  const oldNodes = kAlienFragment(parent)
  return oldNodes?.filter(filterMovedNodes) || Array.from(parent.childNodes)
}

// Filter out any child nodes that have since been moved to another
// parent element.
const filterMovedNodes = (node: ChildNode, index: number, nodes: ChildNode[]) =>
  node.isConnected && (index === 0 || node.parentNode === nodes[0].parentNode)

/**
 * Prepare a fragment node for insertion into the DOM.
 */
export function prepareFragment(
  fragment: DocumentFragment,
  component?: AlienComponent | null
) {
  let childNodes: ChildNode[] | undefined

  if (currentMode.is('deref')) {
    fragment = revertAllPlaceholders(fragment)
  } else if (component && (childNodes = kAlienFragment(fragment))) {
    // For child nodes still in the DOM, generate a placeholder to
    // indicate a no-op. Otherwise, reuse the child node.
    childNodes.forEach(child => {
      if (child.isConnected) {
        child = getPlaceholder(child as any)
      }
      fragment.appendChild(child)
    })
  }

  if (!childNodes) {
    // This is the first time the fragment is being appended, so
    // cache its child nodes.
    childNodes = Array.from(fragment.childNodes)
    kAlienFragment(fragment, childNodes)
  }

  return fragment
}
