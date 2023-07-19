import { toChildNodes } from '../internal/fragment'
import {
  kAlienEffects,
  kAlienElementTags,
  kAlienRefProp,
} from '../internal/symbols'
import { isElement, isFragment, isTextNode } from './typeChecking'

/**
 * Any JSX element created outside of a component must be removed from the DOM
 * with this function if you don't plan to reuse it. If you only want to reuse
 * some or all of its descendants, be sure to remove those descendants (with
 * `node.remove()` not this method) before calling this.
 */
export function unmount(node: ChildNode, skipRemove?: boolean) {
  // Recurse through the last descendants first, so effects are disabled
  // bottom-up in reverse order.
  if (isFragment(node)) {
    for (const childNode of toChildNodes(node).reverse()) {
      unmount(childNode, true)
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

      const oldRefs = kAlienRefProp(node)
      oldRefs?.forEach(ref => {
        ref.setElement(null)
      })
    }

    if (!isTextNode(node)) {
      const effects = kAlienEffects(node)
      effects?.disable(true)

      const tags = kAlienElementTags(node)
      if (tags) {
        // If a node is the root node of multiple components, the deepest
        // component is disabled first.
        for (const component of tags.values()) {
          component.disable()
        }
      }
    }

    if (!skipRemove) {
      node.remove()
    }
  }
}
