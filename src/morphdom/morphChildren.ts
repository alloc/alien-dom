import { isArray, isFunction } from '@alloc/is'
import { Falsy } from '@alloc/types'
import { getElementKey } from '../functions/getElementKey'
import { unmount } from '../functions/unmount'
import { AlienComponent } from '../internal/component'
import { hasTagName, isComment, isElement, isFragment } from '../internal/duck'
import { FragmentNodes } from '../internal/fragment'
import {
  kAlienElementKey,
  kAlienElementPosition,
  kAlienElementTags,
  kAlienFragmentNodes,
  kAlienParentFragment,
} from '../internal/symbols'
import { Fragment } from '../jsx-dom/jsx-runtime'
import {
  DeferredCompositeNode,
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
import { morphComposite } from './morphComposite'
import { morphFragment } from './morphFragment'

const defaultNextSibling = (node: ChildNode) => node.nextSibling

export interface ParentNode {
  childNodes: { length: number }
  firstChild: ChildNode | null
  appendChild: (node: ChildNode) => void
}

type MorphChildrenOptions = {
  getFromKey?: (fromNode: ChildNode) => JSX.ElementKey | undefined
  getNextSibling?: (fromNode: ChildNode) => ChildNode | null
  /** When a child node is new, preserved, or undefined, this callback is invoked. */
  onChildNode?: (node: ChildNode | undefined) => void
}

/**
 * Find direct children that can be morphed/added and allow for discarded nodes
 * to be preserved.
 */
export function morphChildren(
  fromParentNode: ParentNode,
  toChildNodes: ResolvedChild[] | Falsy,
  component: AlienComponent | null = null,
  options: MorphChildrenOptions = {}
): void {
  if (!fromParentNode.childNodes.length) {
    if (!toChildNodes || !toChildNodes.length) {
      return
    }
  } else {
    toChildNodes ||= []
  }

  const { getFromKey = getElementKey, onChildNode = noop } = options

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

  let fromChildNode = fromParentNode.firstChild
  if (fromChildNode && !isDiscardableNode(fromChildNode)) {
    fromChildNode = nextDiscardableNode(fromChildNode, component, options)
  }

  const unmatchedFromKeys = new Set<JSX.ElementKey>()
  const fromNodesByKey = collectKeyedNodes(fromChildNode, component, options)

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
      const matchingNode = fromNodesByKey.get(toChildKey)
      if (matchingNode) {
        // Speed up future lookups and prevent removal.
        fromNodesByKey.delete(toChildKey)

        if (isFragment(matchingNode)) {
          let nextSibling: ChildNode | null = null
          let childNodes: (ChildNode | undefined)[] =
            kAlienFragmentNodes(matchingNode)!

          if (childNodes[0] !== fromChildNode) {
            // Move the fragment before the current from node.
            nextSibling = fromChildNode
          } else {
            // Jump to the end of the fragment.
            const lastChildNode = childNodes.at(-1) as ChildNode
            fromChildNode = nextDiscardableNode(
              lastChildNode,
              component,
              options
            )
          }

          let resolvedNode: DocumentFragment | Element | Comment = matchingNode
          if (isDeferredNode(toChildNode)) {
            if (toChildNode.tag === Fragment) {
              morphFragment(matchingNode, toChildNode as any, component)
            } else {
              resolvedNode = morphComposite(matchingNode, toChildNode as any)
            }
          }

          const oldChildNodes = childNodes as FragmentNodes
          childNodes = isFragment(resolvedNode)
            ? kAlienFragmentNodes(resolvedNode) ||
              Array.from(resolvedNode.childNodes)
            : [resolvedNode]

          for (const childNode of childNodes) {
            onChildNode(childNode)

            if (childNode) {
              if (nextSibling) {
                nextSibling.before(childNode)
              } else if (matchingNode !== resolvedNode) {
                oldChildNodes[0].before(childNode)
              }
            }
          }

          if (matchingNode !== resolvedNode) {
            unmount(matchingNode)
          }

          toChildIndex++
          continue
        }

        if (isCompatibleNode(matchingNode, toChildNode)) {
          let nextSibling: ChildNode | null = null
          if (matchingNode !== fromChildNode) {
            // Insert the matching node before the current from node.
            nextSibling = fromChildNode
          } else {
            // Continue to the next from node.
            fromChildNode = nextDiscardableNode(
              fromChildNode,
              component,
              options
            )
          }

          updateChild(
            matchingNode,
            toChildNode,
            component,
            nextSibling,
            onChildNode
          )

          toChildIndex++
          continue
        }
      }

      // This node has no compatible from node.
      insertChild(fromParentNode, toChildNode, fromChildNode, onChildNode)
      toChildIndex++

      // Remove the incompatible from node.
      if (matchingNode) {
        unmount(matchingNode)
      }
    } else {
      while (fromChildNode) {
        const fromNextSibling = nextDiscardableNode(
          fromChildNode,
          component,
          options
        )

        const fromChildKey = getFromKey(fromChildNode)
        if (fromChildKey != null) {
          unmatchedFromKeys.add(fromChildKey)
        }
        // Unkeyed nodes are matched by nodeType and nodeName.
        else if (isCompatibleNode(fromChildNode, toChildNode)) {
          updateChild(fromChildNode, toChildNode, component, null, onChildNode)

          fromChildNode = fromNextSibling
          toChildIndex++
          continue outer
        } else {
          // Unkeyed nodes are removed immediately when no match is found.
          unmount(fromChildNode)
        }

        fromChildNode = fromNextSibling
      }

      // This node has no compatible from node.
      insertChild(fromParentNode, toChildNode, null, onChildNode)
      toChildIndex++
    }
  }

  let removedFromNode: ChildNode | DocumentFragment | null | undefined

  // Remove any from nodes with unmatched keys.
  for (const key of unmatchedFromKeys) {
    removedFromNode = fromNodesByKey.get(key)
    if (removedFromNode) {
      unmount(removedFromNode)
    }
  }

  // Remove any remaining from nodes.
  while ((removedFromNode = fromChildNode)) {
    fromChildNode = nextDiscardableNode(fromChildNode, component, options)
    unmount(removedFromNode)
  }

  if (hasTagName(fromParentNode, 'SELECT')) {
    resolveSelected(fromParentNode)
  }
}

type ToNode = ChildNode | DeferredHostNode | DeferredCompositeNode

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
  component: AlienComponent | null,
  nextSibling: ChildNode | null,
  onChildNode: (node: ChildNode | undefined) => void
) {
  // Convert an element reference to its deferred node.
  if (component && fromNode === toNode) {
    const key = getElementKey(toNode)!
    const update = component.updates?.get(key)
    if (update) {
      toNode = update
    }
  }

  let morphedNode: DocumentFragment | Element | Comment | undefined
  if (isDeferredNode(toNode)) {
    morphedNode = morph(fromNode as any, toNode, component)
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

  if (morphedNode && morphedNode !== fromNode) {
    console.log('morph returned a new node', morphedNode)
    const fromPosition = kAlienElementPosition(fromNode)
    if (isFragment(morphedNode)) {
      const childNodes = kAlienFragmentNodes(morphedNode)!
      childNodes.forEach((node, i) => {
        fromPosition && kAlienElementPosition(node, fromPosition + '*' + i)
        onChildNode(node)
      })
    } else {
      fromPosition && kAlienElementPosition(morphedNode, fromPosition)
      onChildNode(morphedNode)
    }
    if (!nextSibling) {
      fromNode.before(morphedNode)
    }
    unmount(fromNode)
  } else {
    onChildNode(fromNode)
  }

  // If a sibling is passed, nodes are being reordered.
  nextSibling?.before(morphedNode || fromNode)
}

function nextDiscardableNode(
  node: ChildNode,
  component: AlienComponent | Falsy,
  options: MorphChildrenOptions
) {
  const { getNextSibling = defaultNextSibling } = options
  let nextSibling = getNextSibling(node)
  while (nextSibling && component && !isDiscardableNode(nextSibling)) {
    nextSibling = getNextSibling(nextSibling)
  }
  return nextSibling
}

function collectKeyedNodes(
  firstChildNode: ChildNode | null,
  component: AlienComponent | null | undefined,
  options: MorphChildrenOptions
) {
  const { getFromKey = getElementKey } = options
  const fromNodesByKey = new Map<
    JSX.ElementKey,
    Element | Comment | DocumentFragment
  >()
  for (
    let fromChildNode = firstChildNode;
    fromChildNode;
    fromChildNode = nextDiscardableNode(fromChildNode, component, options)
  ) {
    if (isElement(fromChildNode)) {
      const key = getFromKey(fromChildNode)
      if (key != null) {
        fromNodesByKey.set(key, fromChildNode)
      }
    } else if (isComment(fromChildNode)) {
      const fragment = kAlienParentFragment(fromChildNode)
      if (!fragment) {
        continue
      }
      let position = kAlienElementPosition(fromChildNode)
      if (position != null) {
        fromNodesByKey.set(position, fragment)
      }
      position = kAlienElementPosition(fragment)
      if (position != null) {
        fromNodesByKey.set(position, fragment)
      }
      const key = kAlienElementKey(fragment)
      if (key != null) {
        fromNodesByKey.set(key, fragment)
      }
      // Skip to the end of the fragment.
      const childNodes = kAlienFragmentNodes(fragment)!
      fromChildNode = childNodes.at(-1) as ChildNode
    }
  }
  return fromNodesByKey
}
