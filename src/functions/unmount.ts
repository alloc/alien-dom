import { AlienComponent } from '../internal/component'
import {
  kAlienEffects,
  kAlienElementTags,
  kAlienFragmentNodes,
  kAlienHostProps,
} from '../internal/symbols'
import { isElement, isFragment, isTextNode } from './typeChecking'

/**
 * Any JSX element created outside of a component must be removed from the DOM
 * with this function if you don't plan to reuse it. If you only want to reuse
 * some or all of its descendants, be sure to remove those descendants (with
 * `node.remove()` not this method) before calling this.
 */
export function unmount(
  node: ChildNode | DocumentFragment | null | undefined,
  skipRemove?: boolean,
  keepComponent?: AlienComponent | null
): void {
  if (!node) {
    return
  }
  // Recurse through the last descendants first, so effects are disabled
  // bottom-up in reverse order.
  if (isFragment(node)) {
    const childNodes = kAlienFragmentNodes(node) || Array.from(node.childNodes)
    for (let i = childNodes.length - 1; i >= 0; i--) {
      const childNode = childNodes[i]
      if (childNode) {
        unmount(childNode)
      }
    }
  } else {
    if (isElement(node)) {
      for (
        let childNode = node.lastChild;
        childNode;
        childNode = childNode.previousSibling
      ) {
        unmount(childNode, true)
      }

      // Disconnect any persistent effects or element refs.
      const hostProps = kAlienHostProps(node)
      hostProps?.unmount()
    }

    if (!isTextNode(node)) {
      const effects = kAlienEffects(node)
      effects?.disable(true)

      const tags = kAlienElementTags(node)
      if (tags) {
        // If a node is the root node of multiple components, the deepest
        // component is disabled first.
        for (const component of tags.values()) {
          if (component === keepComponent) break
          component.disable()
        }
      }
    }

    if (!skipRemove) {
      node.remove()
    }
  }
}
