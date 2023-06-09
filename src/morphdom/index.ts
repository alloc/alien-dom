import { compareNodeNames, moveChildren, createElementNS } from './util'
import { morphOptionElement } from './morphOption'
import { morphSelectElement } from './morphSelect'
import { morphTextAreaElement } from './morphTextArea'
import { morphInputElement } from './morphInput'
import {
  hasTagName,
  isTextNode,
  isComment,
  isFragment,
  isElement,
} from '../internal/duck'
import { noop } from '../jsx-dom/util'
import {
  kCommentNodeType,
  kFragmentNodeType,
  kElementNodeType,
  kTextNodeType,
} from '../internal/constants'
import { morphAttrs } from './morphAttrs'

export interface MorphDomOptions {
  getNodeKey?: (node: Node) => any
  onBeforeNodeAdded?: (node: Node) => Node | false | undefined
  onNodeAdded?: (node: Node) => Node
  onBeforeElUpdated?: (fromEl: Node.Element, toEl: Node.Element) => boolean
  onElUpdated?: (el: Node.Element) => void
  onBeforeNodeDiscarded?: (node: Node) => boolean
  onNodeDiscarded?: (node: Node) => void
  onBeforeElChildrenUpdated?: (
    fromEl: Node.Element,
    toEl: Node.Element
  ) => boolean
  skipFromChildren?: (node: Node) => boolean
  addChild?: (parent: Node, child: Node) => void
  childrenOnly?: boolean
}

export function morph(
  fromNode: Node,
  toNode: Node,
  options: MorphDomOptions = {}
) {
  const {
    getNodeKey = noop,
    onBeforeNodeAdded = noop,
    onNodeAdded = noop,
    onBeforeElUpdated = noop,
    onElUpdated = noop,
    onBeforeNodeDiscarded = noop,
    onNodeDiscarded = noop,
    onBeforeElChildrenUpdated = noop,
    skipFromChildren = noop,
    addChild = defaultAddChild,
    childrenOnly = false,
  } = options

  if (isFragment(toNode)) {
    toNode = toNode.firstElementChild as Node.Element
  }

  // This object is used as a lookup to quickly find all keyed
  // elements in the original DOM tree.
  var fromNodesLookup = new Map<any, Node.Element>()
  var keyedRemovalList: any[] = []

  function walkDiscardedChildNodes(node: Node, skipKeyedNodes?: boolean) {
    if (isElement(node)) {
      var curChild = node.firstChild as Node
      while (curChild) {
        var key = undefined

        if (skipKeyedNodes && (key = getNodeKey(curChild)) != null) {
          // If we are skipping keyed nodes then we add the key to a
          // list so that it can be handled at the very end.
          keyedRemovalList.push(key)
        } else {
          // Only report the node as discarded if it is not keyed. We
          // do this because, at the end, we loop through all keyed
          // elements that were unmatched and then discard them in one
          // final pass.
          onNodeDiscarded(curChild)
          if (curChild.firstChild) {
            walkDiscardedChildNodes(curChild, skipKeyedNodes)
          }
        }

        curChild = curChild.nextSibling as Node
      }
    }
  }

  /**
   * Removes a DOM node out of the original DOM
   */
  function removeNode(
    node: Node,
    parentNode: ParentNode,
    skipKeyedNodes: boolean
  ) {
    if (onBeforeNodeDiscarded(node) === false) {
      return
    }

    if (parentNode) {
      parentNode.removeChild(node)
    }

    onNodeDiscarded(node)
    walkDiscardedChildNodes(node, skipKeyedNodes)
  }

  if (isElement(fromNode) || isFragment(fromNode)) {
    var curChild = fromNode.firstChild as Node
    while (curChild) {
      var key = getNodeKey(curChild)
      if (key != null && isElement(curChild)) {
        fromNodesLookup.set(key, curChild)
      }
      curChild = curChild.nextSibling as Node
    }
  }

  function handleNodeAdded(el: Node) {
    onNodeAdded(el)

    var curChild = el.firstChild as Node
    while (curChild) {
      var nextSibling = curChild.nextSibling as Node

      var key = getNodeKey(curChild)
      if (key != null) {
        var unmatchedFromEl = fromNodesLookup.get(key)
        // if we find a duplicate #id node in cache, replace `el` with
        // cache value and morph it to the child node.
        if (unmatchedFromEl && compareNodeNames(curChild, unmatchedFromEl)) {
          curChild.parentNode!.replaceChild(unmatchedFromEl, curChild)
          if (isElement(curChild)) {
            morphEl(unmatchedFromEl, curChild)
          }
        } else {
          handleNodeAdded(curChild)
        }
      } else {
        // recursively call for curChild and it's children to see if we
        // find something in fromNodesLookup
        handleNodeAdded(curChild)
      }

      curChild = nextSibling
    }
  }

  function cleanupFromEl(
    fromEl: Node.Element,
    curFromNodeChild: Node | undefined,
    curFromNodeKey: any
  ) {
    // We have processed all of the "to nodes". If curFromNodeChild is
    // non-null then we still have some from nodes left over that need
    // to be removed
    while (curFromNodeChild) {
      var fromNextSibling = curFromNodeChild.nextSibling as Node
      if ((curFromNodeKey = getNodeKey(curFromNodeChild)) != null) {
        // Since the node is keyed it might be matched up later so we defer
        // the actual removal to later
        keyedRemovalList.push(curFromNodeKey)
      } else {
        // NOTE: we skip nested keyed nodes from being removed since there is
        //       still a chance they will be matched up later
        removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */)
      }
      curFromNodeChild = fromNextSibling
    }
  }

  function morphEl(
    fromEl: Node.Element,
    toEl: Node.Element,
    childrenOnly?: boolean
  ) {
    var toElKey = getNodeKey(toEl)

    if (toElKey != null) {
      // If an element with an ID is being morphed then it will be in
      // the final DOM so clear it out of the saved elements
      // collection
      fromNodesLookup.delete(toElKey)
    }

    if (!childrenOnly) {
      // optional
      if (onBeforeElUpdated(fromEl, toEl) === false) {
        return
      }

      // update attributes on original DOM element first
      morphAttrs(fromEl, toEl)
      // optional
      onElUpdated(fromEl)

      if (onBeforeElChildrenUpdated(fromEl, toEl) === false) {
        return
      }
    }

    if (hasTagName(fromEl, 'TEXTAREA')) {
      morphTextAreaElement(fromEl, toEl as HTMLTextAreaElement)
    } else {
      morphChildren(fromEl, toEl)
    }
  }

  function morphChildren(fromEl: Node.Element, toEl: Node.Element) {
    var skipFrom = skipFromChildren(fromEl)
    var curToNodeChild = toEl.firstChild as Node | undefined
    var curFromNodeChild = fromEl.firstChild as Node | undefined
    var curToNodeKey: any
    var curFromNodeKey: any

    var fromNextSibling: Node | undefined
    var toNextSibling: Node | undefined
    var matchingFromEl: Node.Element | undefined

    // walk the children
    outer: while (curToNodeChild) {
      toNextSibling = curToNodeChild.nextSibling as Node
      curToNodeKey = getNodeKey(curToNodeChild)

      // walk the fromNode children all the way through
      while (!skipFrom && curFromNodeChild) {
        fromNextSibling = curFromNodeChild.nextSibling as Node

        if (
          curToNodeChild.isSameNode &&
          curToNodeChild.isSameNode(curFromNodeChild)
        ) {
          curToNodeChild = toNextSibling
          curFromNodeChild = fromNextSibling
          continue outer
        }

        curFromNodeKey = getNodeKey(curFromNodeChild)

        // this means if the curFromNodeChild doesnt have a match with the curToNodeChild
        var isCompatible = undefined

        if (curFromNodeChild.nodeType === curToNodeChild.nodeType) {
          if (isElement(curFromNodeChild)) {
            // Both nodes being compared are Element nodes

            if (curToNodeKey != null) {
              // The target node has a key so we want to match it up
              // with the correct element in the original DOM tree.
              if (curToNodeKey !== curFromNodeKey) {
                // The current element in the original DOM tree does not
                // have a matching key so let's check our lookup to see
                // if there is a matching element in the original DOM
                // tree.
                if ((matchingFromEl = fromNodesLookup.get(curToNodeKey))) {
                  if (fromNextSibling === matchingFromEl) {
                    // Special case for single element removals. To
                    // avoid removing the original DOM node out of the
                    // tree (since that can break CSS transitions,
                    // etc.), we will instead discard the current node
                    // and wait until the next iteration to properly
                    // match up the keyed target element with its
                    // matching element in the original tree
                    isCompatible = false
                  } else {
                    // We found a matching keyed element somewhere in
                    // the original DOM tree. Let's move the original
                    // DOM node into the current position and morph it.

                    // NOTE: We use insertBefore instead of replaceChild
                    // because we want to go through the `removeNode()`
                    // function for the node that is being discarded so
                    // that all lifecycle hooks are correctly invoked
                    fromEl.insertBefore(matchingFromEl, curFromNodeChild)

                    // fromNextSibling = curFromNodeChild.nextSibling;

                    if (curFromNodeKey != null) {
                      // Since the node is keyed it might be matched up
                      // later so we defer the actual removal to later
                      keyedRemovalList.push(curFromNodeKey)
                    } else {
                      // NOTE: We skip nested keyed nodes from being
                      // removed since there is still a chance they will
                      // be matched up later.
                      removeNode(
                        curFromNodeChild,
                        fromEl,
                        true /* skip keyed nodes */
                      )
                    }

                    curFromNodeChild = matchingFromEl
                  }
                } else {
                  // The nodes are not compatible since the "to" node has a key and there
                  // is no matching keyed node in the source tree
                  isCompatible = false
                }
              }
            } else if (curFromNodeKey != null) {
              // The original has a key
              isCompatible = false
            }

            isCompatible =
              isCompatible !== false &&
              compareNodeNames(curFromNodeChild, curToNodeChild)

            if (isCompatible) {
              // We found compatible DOM elements so transform the
              // current "from" node to match the current target DOM
              // node.
              morphEl(curFromNodeChild, curToNodeChild as Node.Element)
            }
          } else if (
            isTextNode(curFromNodeChild) ||
            isComment(curFromNodeChild)
          ) {
            // Both nodes being compared are Text or Comment nodes
            isCompatible = true
            // Simply update nodeValue on the original node to
            // change the text value
            if (curFromNodeChild.nodeValue !== curToNodeChild.nodeValue) {
              curFromNodeChild.nodeValue = curToNodeChild.nodeValue
            }
          }
        }

        if (isCompatible) {
          // Advance both the "to" child and the "from" child since we
          // found a match. Nothing else to do as we already
          // recursively called morphChildren above
          curToNodeChild = toNextSibling
          curFromNodeChild = fromNextSibling
          continue outer
        }

        // No compatible match so remove the old node from the DOM and
        // continue trying to find a match in the original DOM.
        // However, we only do this if the from node is not keyed
        // since it is possible that a keyed node might match up with
        // a node somewhere else in the target tree and we don't want
        // to discard it just yet since it still might find a home in
        // the final DOM tree. After everything is done we will remove
        // any keyed nodes that didn't find a home.
        if (curFromNodeKey != null) {
          // Since the node is keyed it might be matched up later so
          // we defer the actual removal to later.
          keyedRemovalList.push(curFromNodeKey)
        } else {
          // NOTE: we skip nested keyed nodes from being removed since
          //       there is still a chance they will be matched up
          //       later
          removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */)
        }

        curFromNodeChild = fromNextSibling
      } // END: while(curFromNodeChild) {}

      // If we got this far then we did not find a candidate match for
      // our "to node" and we exhausted all of the children "from"
      // nodes. Therefore, we will just append the current "to" node to
      // the end.
      if (
        curToNodeKey != null &&
        (matchingFromEl = fromNodesLookup.get(curToNodeKey)) &&
        compareNodeNames(matchingFromEl, curToNodeChild)
      ) {
        if (!skipFrom) {
          addChild(fromEl, matchingFromEl)
        }
        morphEl(matchingFromEl, curToNodeChild as Node.Element)
      } else {
        var onBeforeNodeAddedResult = onBeforeNodeAdded(curToNodeChild)
        if (onBeforeNodeAddedResult !== false) {
          if (onBeforeNodeAddedResult) {
            curToNodeChild = onBeforeNodeAddedResult
          }

          addChild(fromEl, curToNodeChild)
          handleNodeAdded(curToNodeChild)
        }
      }

      curToNodeChild = toNextSibling
      curFromNodeChild = fromNextSibling
    }

    cleanupFromEl(fromEl, curFromNodeChild, curFromNodeKey)

    const specialMorph = specialMorphs[fromEl.nodeName] as
      | ((fromEl: Node.Element, toEl: Node.Element) => void)
      | undefined

    if (specialMorph) {
      specialMorph(fromEl, toEl)
    }
  } // END: morphChildren(...)

  var morphedNode = fromNode

  if (!childrenOnly) {
    // Handle the case where we are given two DOM nodes that are not
    // compatible (e.g. <div> --> <span> or <div> --> TEXT)
    if (isElement(fromNode)) {
      if (isElement(toNode)) {
        if (!compareNodeNames(fromNode, toNode)) {
          onNodeDiscarded(fromNode)
          morphedNode = moveChildren(
            fromNode,
            createElementNS(
              toNode.ownerDocument,
              toNode.nodeName,
              toNode.namespaceURI
            )
          ) as Node.Element
        }
      } else {
        // Going from an element node to a text node
        morphedNode = toNode
      }
    } else if (isTextNode(fromNode) || isComment(fromNode)) {
      if (toNode.nodeType === fromNode.nodeType) {
        if (fromNode.nodeValue !== toNode.nodeValue) {
          fromNode.nodeValue = toNode.nodeValue
        }

        return fromNode
      }

      // Text node to something else
      morphedNode = toNode
    }
  }

  if (morphedNode === toNode) {
    // The "to node" was not compatible with the "from node" so we had
    // to toss out the "from node" and use the "to node".
    onNodeDiscarded(fromNode)
  } else {
    if (toNode.isSameNode && toNode.isSameNode(morphedNode)) {
      return
    }

    morphEl(morphedNode as Node.Element, toNode as Node.Element, childrenOnly)

    // We now need to loop over any keyed nodes that might need to be
    // removed. We only do the removal if we know that the keyed node
    // never found a match. When a keyed node is matched up we remove it
    // out of fromNodesLookup and we use fromNodesLookup to determine if
    // a keyed node has been matched up or not.
    for (const key of keyedRemovalList) {
      var elToRemove = fromNodesLookup.get(key)
      if (elToRemove) {
        removeNode(elToRemove, elToRemove.parentNode!, false)
      }
    }
  }

  if (!childrenOnly && morphedNode !== fromNode && fromNode.parentNode) {
    // If we had to swap out the from node with a new node because the
    // old node was not compatible with the target node then we need to
    // replace the old DOM node in the original DOM tree. This is only
    // possible if the original DOM node was part of a DOM tree which we
    // know is the case if it has a parent node.
    fromNode.parentNode.replaceChild(morphedNode, fromNode)
  }

  return morphedNode
}

type Node = Node.Element | Node.Text | Node.Comment | Node.Fragment

declare namespace Node {
  type HTMLElement = globalThis.HTMLElement & {
    nodeType: typeof kElementNodeType
  }
  type Element = globalThis.Element & { nodeType: typeof kElementNodeType }
  type Text = globalThis.Text & { nodeType: typeof kTextNodeType }
  type Comment = globalThis.Comment & { nodeType: typeof kCommentNodeType }
  type Fragment = globalThis.DocumentFragment & {
    nodeType: typeof kFragmentNodeType
  }
}

const specialMorphs: Record<string, Function> = {
  OPTION: morphOptionElement,
  INPUT: morphInputElement,
  TEXTAREA: morphTextAreaElement,
  SELECT: morphSelectElement,
}

function defaultAddChild(parent: Node, child: Node) {
  parent.appendChild(child)
}
