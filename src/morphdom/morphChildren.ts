import { isArray, isString } from '@alloc/is'
import { unmount } from '../functions/unmount'
import { isElement } from '../internal/duck'
import { kAlienElementKey } from '../internal/symbols'
import { DeferredNode, isDeferredNode, isShadowRoot } from '../jsx-dom/node'
import { ResolvedChild } from '../jsx-dom/resolveChildren'
import { compareNodeNames, noop } from '../jsx-dom/util'
import { JSX } from '../types/jsx'

/**
 * Find direct children that can be morphed/added and allow for discarded nodes
 * to be preserved.
 */
export function morphChildren(
  fromParentNode: Element,
  toParentNode: Element | DeferredNode,
  options: {
    onNodeAdded: (
      node: ChildNode | DeferredNode,
      nextSibling?: ChildNode | null
    ) => void
    /** The `fromNode` has a matching `toNode`, but you're responsible for morphing if desired. */
    onNodePreserved: (
      fromNode: ChildNode,
      toNode: ChildNode | DeferredNode,
      nextSibling?: ChildNode | null
    ) => void
    /** The `node` will be discarded unless false is returned. */
    onBeforeNodeDiscarded?: (node: ChildNode) => boolean
  }
): void {
  let toChildren = toParentNode.children as HTMLCollection | ResolvedChild[]
  if (!fromParentNode.childNodes.length && !toChildren.length) {
    return
  }

  if (!isArray(toChildren)) {
    toChildren = Array.from(toChildren)
  } else if (isShadowRoot(toChildren[0])) {
    if (toChildren.length !== 1) {
      throw Error('ShadowRoot must be the only child')
    }
    // Shadow roots handle their own morphing.
    return
  }

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

  const { onBeforeNodeDiscarded = noop, onNodeAdded, onNodePreserved } = options

  let fromChildNode = fromParentNode.firstChild
  let toChildIndex = 0

  // Find matching nodes.
  outer: while (toChildIndex < toChildren.length) {
    const toChildNode = toChildren[toChildIndex]

    if (isShadowRoot(toChildNode)) {
      throw Error('ShadowRoot must be the only child')
    }

    const toChildKey = kAlienElementKey(toChildNode)
    if (toChildKey != null) {
      const matchingNode = fromElementsByKey.get(toChildKey)
      if (matchingNode) {
        // Speed up future lookups and prevent removal.
        fromElementsByKey.delete(toChildKey)

        if (isCompatibleNode(matchingNode, toChildNode)) {
          let nextSibling: ChildNode | null = null
          if (matchingNode !== fromChildNode) {
            // Insert the matching node before the current from node.
            nextSibling = fromChildNode
          } else {
            // Continue to the next from node.
            fromChildNode = fromChildNode.nextSibling
          }

          onNodePreserved(matchingNode, toChildNode, nextSibling)
          toChildIndex++
          continue
        }
      }

      // This node has no compatible from node.
      onNodeAdded(toChildNode, fromChildNode)
      toChildIndex++

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
        //let nextSibling = matchingNode Unkeyed nodes are matched by nodeType and nodeName.
        else if (isCompatibleNode(fromChildNode, toChildNode)) {
          onNodePreserved(fromChildNode, toChildNode)

          fromChildNode = fromNextSibling
          toChildIndex++
          continue outer
        }
        // Unkeyed nodes are removed immediately when no match is found.
        else if (onBeforeNodeDiscarded(fromChildNode) !== false) {
          unmount(fromChildNode)
        }

        fromChildNode = fromNextSibling
      }

      // This node has no compatible from node.
      onNodeAdded(toChildNode)
      toChildIndex++
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

function isCompatibleNode(fromNode: Node, toNode: ChildNode | DeferredNode) {
  if (isDeferredNode(toNode)) {
    if (!isElement(fromNode)) {
      return false
    }
    if (!isString(toNode.tag)) {
      return false
    }
    return compareNodeNames(fromNode.nodeName, toNode.tag)
  }
  if (fromNode.nodeType !== toNode.nodeType) {
    return false
  }
  if (!isElement(fromNode)) {
    return true
  }
  return fromNode.nodeName === toNode.nodeName
}
