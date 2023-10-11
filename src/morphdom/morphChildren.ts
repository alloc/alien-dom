import { isArray, isFunction } from '@alloc/is'
import { Falsy } from '@alloc/types'
import { getElementKey } from '../functions/getElementKey'
import { unmount } from '../functions/unmount'
import { AlienComponent } from '../internal/component'
import { hasTagName, isElement, isFragment } from '../internal/duck'
import { kAlienElementPosition, kAlienElementTags } from '../internal/symbols'
import {
  DeferredComponentNode,
  DeferredHostNode,
  evaluateDeferredNode,
  isDeferredNode,
  isShadowRoot,
} from '../jsx-dom/node'
import { ResolvedChild } from '../jsx-dom/resolveChildren'
import { resolveSelected } from '../jsx-dom/resolveSelected'
import { compareNodeNames, noop } from '../jsx-dom/util'
import { JSX } from '../types/jsx'
import { morph } from './morph'

const defaultNextSibling = (node: ChildNode) => node.nextSibling

export interface ParentNode {
  childNodes: { length: number }
  firstChild: ChildNode | null
  appendChild: (node: ChildNode) => void
}

/**
 * Find direct children that can be morphed/added and allow for discarded nodes
 * to be preserved.
 */
export function morphChildren(
  fromParentNode: ParentNode,
  toChildNodes: ResolvedChild[] | Falsy,
  component?: AlienComponent | null,
  options: {
    getFromKey?: (fromNode: ChildNode) => JSX.ElementKey | undefined
    getNextSibling?: (fromNode: ChildNode) => ChildNode | null
    /** When a child node is new, preserved, or undefined, this callback is invoked. */
    onChildNode?: (node: ChildNode | undefined) => void
  } = {}
): void {
  if (!fromParentNode.childNodes.length) {
    if (!toChildNodes || !toChildNodes.length) {
      return
    }
  } else {
    toChildNodes ||= []
  }

  const {
    getFromKey = getElementKey,
    getNextSibling = defaultNextSibling,
    onChildNode = noop,
  } = options

  /** The `node` will be discarded unless false is returned. */
  const onBeforeNodeDiscarded = component
    ? // Never remove a node that was added by an event listener or effect. Any
      // nodes added by a component render will have a position-based key defined
      // automatically if they're missing an explicit key, so this check is
      // sufficient.
      isDiscardableNode
    : noop

  if (!isArray(toChildNodes)) {
    toChildNodes = Array.from(toChildNodes)
  }
  // Shadow root must be the only child.
  else if (isShadowRoot(toChildNodes[0])) {
    if (toChildNodes.length !== 1) {
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
    fromChildNode = getNextSibling(fromChildNode)
  ) {
    const key = getFromKey(fromChildNode)
    if (key != null && isElement(fromChildNode)) {
      fromElementsByKey.set(key, fromChildNode)
    }
  }

  let fromChildNode = fromParentNode.firstChild
  let toChildIndex = 0

  // Find matching nodes.
  outer: while (toChildIndex < toChildNodes.length) {
    const toChildNode = toChildNodes[toChildIndex]

    if (toChildNode === null) {
      onChildNode(undefined)
      toChildIndex++
      continue
    }

    if (isShadowRoot(toChildNode)) {
      throw Error('ShadowRoot must be the only child')
    }

    const toChildKey = getElementKey(toChildNode)
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
            fromChildNode = getNextSibling(fromChildNode)
          }

          onChildNode(
            updateChild(matchingNode, toChildNode, component, nextSibling)
          )

          toChildIndex++
          continue
        }
      }

      // This node has no compatible from node.
      insertChild(fromParentNode, toChildNode, fromChildNode, onChildNode)
      toChildIndex++

      // Remove the incompatible from node.
      if (matchingNode && onBeforeNodeDiscarded(matchingNode) !== false) {
        unmount(matchingNode)
      }
    } else {
      while (fromChildNode) {
        const fromNextSibling = getNextSibling(fromChildNode)
        const fromChildKey = getFromKey(fromChildNode)

        if (fromChildKey != null) {
          unmatchedFromKeys.add(fromChildKey)
        }
        // Unkeyed nodes are matched by nodeType and nodeName.
        else if (isCompatibleNode(fromChildNode, toChildNode)) {
          updateChild(fromChildNode, toChildNode, component)
          onChildNode(fromChildNode)

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
      insertChild(fromParentNode, toChildNode, null, onChildNode)
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
    fromChildNode = getNextSibling(fromChildNode)

    if (onBeforeNodeDiscarded(removedFromNode) !== false) {
      unmount(removedFromNode)
    }
  }

  if (hasTagName(fromParentNode, 'SELECT')) {
    resolveSelected(fromParentNode)
  }
}

type ToNode = ChildNode | DeferredHostNode | DeferredComponentNode

function isCompatibleNode(fromNode: Node, toNode: ToNode) {
  if (fromNode === toNode) {
    return true
  }
  if (isDeferredNode(toNode)) {
    if (isFunction(toNode.tag)) {
      const tags = kAlienElementTags(fromNode)
      return tags != null && tags.has(toNode.tag)
    }
    if (isElement(fromNode)) {
      return compareNodeNames(fromNode.nodeName, toNode.tag)
    }
    return false
  }
  if (fromNode.nodeType !== toNode.nodeType) {
    return false
  }
  if (isElement(fromNode)) {
    return fromNode.nodeName === toNode.nodeName
  }
  return true
}

function isDiscardableNode(node: Node) {
  // Avoid removing nodes that were added to the DOM by a native API.
  return !isElement(node) || kAlienElementPosition(node) !== undefined
}

function insertChild(
  parentNode: ParentNode,
  node: ToNode,
  nextSibling: ChildNode | null,
  onChildNode: (node: ChildNode | undefined) => void
) {
  let newChild: ChildNode
  if (isDeferredNode(node)) {
    const evaluatedNode = evaluateDeferredNode(node)
    if (isFragment(evaluatedNode)) {
      // FIXME: should this update positional keys?
      return evaluatedNode.childNodes.forEach(childNode => {
        insertChild(parentNode, childNode, nextSibling, onChildNode)
      })
    }
    newChild = evaluatedNode
  } else {
    newChild = node
  }
  if (nextSibling) {
    nextSibling.before(newChild)
  } else {
    parentNode.appendChild(newChild)
  }
  onChildNode(newChild)
}

function updateChild(
  fromNode: ChildNode,
  toNode: ToNode,
  component?: AlienComponent | null,
  nextSibling?: ChildNode | null
) {
  // Convert an element reference to its deferred node.
  if (component && fromNode === toNode) {
    const key = getElementKey(toNode)!
    const update = component.updates?.get(key)
    if (update) {
      toNode = update
    }
  }

  if (isDeferredNode(toNode)) {
    morph(fromNode as any, toNode, component)
  } else if (fromNode !== toNode) {
    if (!isElement(fromNode)) {
      fromNode.nodeValue = toNode.nodeValue
    } else if (nextSibling) {
      unmount(fromNode, false, component)
      fromNode = toNode
    } else {
      fromNode.replaceWith(toNode)
      unmount(fromNode, true, component)
    }
  }

  // Reorder the node if necessary.
  nextSibling?.before(fromNode)
  return fromNode
}
