import { isArray, isFunction } from '@alloc/is'
import { unmount } from '../functions/unmount'
import { AlienComponent } from '../internal/component'
import { hasTagName, isElement } from '../internal/duck'
import { kAlienElementKey, kAlienElementTags } from '../internal/symbols'
import {
  DeferredNode,
  evaluateDeferredNode,
  isDeferredNode,
  isShadowRoot,
} from '../jsx-dom/node'
import { ResolvedChild } from '../jsx-dom/resolveChildren'
import { compareNodeNames, noop } from '../jsx-dom/util'
import { JSX } from '../types/jsx'
import { morph } from './morph'

/**
 * Find direct children that can be morphed/added and allow for discarded nodes
 * to be preserved.
 */
export function morphChildren(
  fromParentNode: Element,
  toChildNodes: HTMLCollection | ResolvedChild[],
  component?: AlienComponent | null
): void {
  if (!fromParentNode.childNodes.length && !toChildNodes.length) {
    return
  }

  /** The `node` will be discarded unless false is returned. */
  const onBeforeNodeDiscarded = component
    ? // Never remove a node that was added by an event listener or effect. Any
      // nodes added by a component render will have a position-based key defined
      // automatically if they're missing an explicit key, so this check is
      // sufficient.
      isKeyedNode
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
    fromChildNode = fromChildNode.nextSibling
  ) {
    const key = kAlienElementKey(fromChildNode)
    if (key != null && isElement(fromChildNode)) {
      fromElementsByKey.set(key, fromChildNode)
    }
  }

  let fromChildNode = fromParentNode.firstChild
  let toChildIndex = 0

  // Find matching nodes.
  outer: while (toChildIndex < toChildNodes.length) {
    const toChildNode = toChildNodes[toChildIndex]

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

          updateChild(
            fromParentNode,
            matchingNode,
            toChildNode,
            component,
            nextSibling
          )

          toChildIndex++
          continue
        }
      }

      // This node has no compatible from node.
      insertChild(fromParentNode, toChildNode, fromChildNode)
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
        // Unkeyed nodes are matched by nodeType and nodeName.
        else if (isCompatibleNode(fromChildNode, toChildNode)) {
          updateChild(fromParentNode, fromChildNode, toChildNode, component)

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
      insertChild(fromParentNode, toChildNode)
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

  if (hasTagName(fromParentNode, 'SELECT')) {
    updateSelected(fromParentNode)
  }
}

function isCompatibleNode(fromNode: Node, toNode: ChildNode | DeferredNode) {
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

function isKeyedNode(node: Node) {
  return kAlienElementKey.in(node)
}

function insertChild(
  parentNode: ParentNode,
  node: ChildNode | DeferredNode,
  nextSibling?: ChildNode | null
) {
  const newChild = isDeferredNode(node) ? evaluateDeferredNode(node) : node
  if (nextSibling) {
    parentNode.insertBefore(newChild, nextSibling)
  } else {
    parentNode.appendChild(newChild)
  }
}

function updateChild(
  parentNode: Node,
  fromNode: ChildNode,
  toNode: ChildNode | DeferredNode,
  component?: AlienComponent | null,
  nextSibling?: ChildNode | null
) {
  // Convert an element reference to its deferred node.
  if (component && fromNode === toNode) {
    const key = kAlienElementKey(toNode)!
    const newElement = component.newElements?.get(key)
    if (newElement) {
      toNode = newElement
    }
  }

  if (isDeferredNode(toNode)) {
    morph(fromNode as any, toNode, component)
  } else if (fromNode !== toNode && !isElement(fromNode)) {
    fromNode.nodeValue = toNode.nodeValue
  }

  // Reorder the node if necessary.
  if (nextSibling) {
    parentNode.insertBefore(fromNode, nextSibling)
  }
}

// TODO: check if this is necessary (inherited from morphdom)
function updateSelected(node: HTMLSelectElement) {
  if (!node.hasAttribute('multiple')) {
    var selectedIndex = -1
    var i = 0
    // We have to loop through children of fromEl, not toEl since nodes
    // can be moved from toEl to fromEl directly when morphing. At the
    // time this special handler is invoked, all children have already
    // been morphed and appended to / removed from fromEl, so using
    // fromEl here is safe and correct.
    var curChild = node.firstChild
    var optgroup
    while (curChild) {
      if (hasTagName(curChild, 'OPTGROUP')) {
        optgroup = curChild
        curChild = optgroup.firstChild
      } else {
        if (hasTagName(curChild, 'OPTION')) {
          if (curChild.hasAttribute('selected')) {
            selectedIndex = i
            break
          }
          i++
        }
        curChild = curChild.nextSibling
        if (!curChild && optgroup) {
          curChild = optgroup.nextSibling
          optgroup = null
        }
      }
    }

    node.selectedIndex = selectedIndex
  }
}
