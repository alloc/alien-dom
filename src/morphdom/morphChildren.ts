import { unmount } from '../functions/unmount'
import { isElement } from '../internal/duck'
import { kAlienElementKey } from '../internal/symbols'
import { noop } from '../jsx-dom/util'
import { JSX } from '../types/jsx'

/**
 * This reorders, inserts, and removes children but doesn't morph attributes.
 */
export function morphChildren(
  fromParentNode: Element,
  toParentNode: Element,
  options: {
    /** The `node` will be discarded unless false is returned. */
    onBeforeNodeDiscarded?: (node: ChildNode) => boolean
    /** The `fromNode` has a matching `toNode`, but you're responsible for morphing if desired. */
    onNodePreserved: (fromNode: ChildNode, toNode: ChildNode) => void
  }
): void {
  const fromElementsByKey = new Map<JSX.ElementKey, Element>()
  const unmatchedFromKeys = new Set<JSX.ElementKey>()
  for (
    let fromChildNode = fromParentNode.firstChild;
    fromChildNode;
    fromChildNode = fromChildNode.nextSibling
  ) {
    const key = kAlienElementKey(fromChildNode)
    if (key != null && isElement(fromChildNode)) {
      fromElementsByKey.set(key, fromChildNode)
    }
  }

  const { onBeforeNodeDiscarded = noop, onNodePreserved } = options

  let fromChildNode = fromParentNode.firstChild
  let toChildNode = toParentNode.firstChild

  // Find matching nodes.
  outer: while (toChildNode) {
    const toNextSibling = toChildNode.nextSibling

    const toChildKey = kAlienElementKey(toChildNode)
    if (toChildKey != null) {
      const matchingNode = fromElementsByKey.get(toChildKey)
      if (matchingNode) {
        // Speed up future lookups and prevent removal.
        fromElementsByKey.delete(toChildKey)

        if (isCompatibleNode(matchingNode, toChildNode)) {
          onNodePreserved(matchingNode, toChildNode)

          // Move the matching node into position.
          if (matchingNode !== fromChildNode) {
            fromParentNode.insertBefore(matchingNode, fromChildNode)
          } else {
            fromChildNode = fromChildNode.nextSibling
          }

          toChildNode = toNextSibling
          continue
        }
      }

      // This node has no compatible from node.
      fromParentNode.insertBefore(toChildNode, fromChildNode)
      toChildNode = toNextSibling

      // Remove the incompatible from node.
      if (matchingNode && onBeforeNodeDiscarded(matchingNode) !== false) {
        unmount(matchingNode)
      }
    } else {
      while (fromChildNode) {
        const fromNextSibling = fromChildNode.nextSibling

        const fromChildKey = kAlienElementKey(fromChildNode)
        if (fromChildKey != null) {
          unmatchedFromKeys.add(fromChildKey)
        }
        // Unkeyed nodes are matched by nodeType and nodeName.
        else if (isCompatibleNode(fromChildNode, toChildNode)) {
          onNodePreserved(fromChildNode, toChildNode)

          fromChildNode = fromNextSibling
          toChildNode = toNextSibling
          continue outer
        }
        // Unkeyed nodes are removed immediately when no match is found.
        else if (onBeforeNodeDiscarded(fromChildNode) !== false) {
          unmount(fromChildNode)
        }

        fromChildNode = fromNextSibling
      }

      // This node has no compatible from node.
      fromParentNode.appendChild(toChildNode)
      toChildNode = toNextSibling
    }
  }

  let removedFromNode: ChildNode | null | undefined

  // Remove any from nodes with unmatched keys.
  for (const key of unmatchedFromKeys) {
    removedFromNode = fromElementsByKey.get(key)

    if (removedFromNode && onBeforeNodeDiscarded(removedFromNode) !== false) {
      unmount(removedFromNode)
    }
  }

  // Remove any remaining from nodes.
  while ((removedFromNode = fromChildNode)) {
    fromChildNode = fromChildNode.nextSibling

    if (onBeforeNodeDiscarded(removedFromNode) !== false) {
      unmount(removedFromNode)
    }
  }
}

function isCompatibleNode(fromNode: Node, toNode: Node) {
  if (fromNode.nodeType !== toNode.nodeType) {
    return false
  }
  if (!isElement(fromNode)) {
    return true
  }
  return fromNode.nodeName === toNode.nodeName
}
