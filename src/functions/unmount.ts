import { isElementProxy } from '../addons/elementProxy'
import type { AlienComponent } from '../internal/component'
import { getPrivate } from '../internal/privateSymbol'
import {
  getElementTags,
  getFragmentNodes,
  getHostProps,
  kAlienEffects,
  kAlienUnmountHandler,
} from '../internal/symbols'
import { isElement, isFragment } from './typeChecking'

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
  if (isElementProxy(node)) {
    node = node.toElement()
  }
  if (node?.isConnected) {
    if (isFragment(node)) {
      const childNodes = getFragmentNodes(node) || Array.from(node.childNodes)

      // Recurse through the last descendants first, so effects are disabled
      // bottom-up in reverse order.
      for (let i = childNodes.length - 1; i >= 0; i--) {
        const childNode = childNodes[i]
        if (childNode) {
          unmountTree(childNode, skipRemove)
        }
      }
    } else {
      unmountTree(node, skipRemove, keepComponent)
    }
  }
}

// The inner function is defined separately to avoid the overhead of the
// `isElementProxy` check on every call.
function unmountTree(
  node: ChildNode,
  skipRemove?: boolean,
  keepComponent?: AlienComponent | null
) {
  if (!skipRemove) {
    node.remove()
  }

  if (isElement(node)) {
    // Recurse through the last descendants first, so effects are disabled
    // bottom-up in reverse order.
    for (
      let childNode = node.lastChild;
      childNode;
      childNode = childNode.previousSibling
    ) {
      unmountTree(childNode, true)
    }

    // Disconnect any persistent effects or element refs.
    const hostProps = getHostProps(node)
    hostProps?.unmount()
  }

  const effects = getPrivate(node, kAlienEffects)
  effects?.disable(true)

  const tags = getElementTags(node)
  if (tags) {
    // If a node is the root node of multiple components, the deepest
    // component is disabled first.
    for (const component of tags.values()) {
      if (component === keepComponent) break
      component.dispose()
    }
  }

  const unmountHandler = getPrivate(node, kAlienUnmountHandler)
  unmountHandler?.()
}
