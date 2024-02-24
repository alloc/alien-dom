import { AlienComponent } from '../internal/component'
import { expectCurrentComponent } from '../internal/global'
import { kAlienElementKey, kAlienFragmentNodes } from '../internal/symbols'
import { isFragment, isTextNode } from './typeChecking'

/**
 * Restore a previous HTML element within a component's node references, so a
 * JSX element using the same key will be reuse the DOM node instead of
 * generating a new one.
 *
 * This function is meant to support JSX updates of DOM nodes that are removed
 * from or moved within the DOM tree, and then subsequently re-added to it.
 */
export function restoreNodeReferences(node: ChildNode | DocumentFragment) {
  const component = expectCurrentComponent()
  component.nodes ??= new Map()

  if (isFragment(node)) {
    const childNodes = kAlienFragmentNodes(node)
    childNodes?.forEach(childNode => {
      if (childNode && !isTextNode(childNode)) {
        restoreComponentRef(childNode, component)
      }
    })
  } else if (!isTextNode(node)) {
    restoreComponentRef(node, component)
  }
}

function restoreComponentRef(node: ChildNode, component: AlienComponent) {
  const key = kAlienElementKey(node)
  if (key != null) {
    component.nodes!.set(key, node)
  }
  node.childNodes.forEach(childNode => {
    if (!isTextNode(childNode)) {
      restoreComponentRef(childNode, component)
    }
  })
}
