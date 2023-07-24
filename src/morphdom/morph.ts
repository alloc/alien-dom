import { isFunction } from '@alloc/is'
import { unmount } from '../functions/unmount'
import { AlienComponent, ElementRefs } from '../internal/component'
import { hasTagName, isElement } from '../internal/duck'
import { kAlienElementKey, kAlienElementTags } from '../internal/symbols'
import type { DefaultElement } from '../internal/types'
import {
  DeferredNode,
  evaluateDeferredNode,
  isDeferredNode,
} from '../jsx-dom/node'
import { compareNodeNames } from '../jsx-dom/util'
import { morphAttributes } from './morphAttributes'
import { morphChildren } from './morphChildren'

/**
 * This function assumes the two nodes are compatible.
 */
export function morph(
  fromParentNode: DefaultElement,
  toParentNode: DeferredNode,
  refs?: ElementRefs | null,
  component?: AlienComponent | null
): void {
  // Check for a deferred component update.
  if (isFunction(toParentNode.tag)) {
    const tags = kAlienElementTags(fromParentNode)
    const component = tags?.get(toParentNode.tag)

    if (component) {
      component.updateProps(toParentNode.props)
      toParentNode.context?.forEach((ref, key) => {
        const targetRef = component.context.get(key)
        if (targetRef) {
          targetRef.value = ref.peek()
        }
      })

      const key = kAlienElementKey(toParentNode)
      if (key != null) {
        component.setRef(key, component.rootNode!)
      }
    } else {
      // The component was not found, so replace the old node.
      const node = evaluateDeferredNode(toParentNode)
      fromParentNode.replaceWith(node)
      unmount(fromParentNode, true)
    }
    return
  }

  // If this happens, there is an internal bug.
  if (!compareNodeNames(fromParentNode.nodeName, toParentNode.tag)) {
    throw Error('morph expects compatible host nodes')
  }

  morphAttributes(fromParentNode, toParentNode)
  morphChildren(fromParentNode, toParentNode, {
    onBeforeNodeDiscarded: component ? discardKeyedNodesOnly : undefined,
    onNodeAdded(node, nextSibling) {
      const newChild = isDeferredNode(node) ? evaluateDeferredNode(node) : node
      if (nextSibling) {
        fromParentNode.insertBefore(newChild, nextSibling)
      } else {
        fromParentNode.appendChild(newChild)
      }
    },
    onNodePreserved(fromNode, toNode, nextSibling) {
      if (fromNode !== toNode) {
        if (isDeferredNode(toNode)) {
          morph(fromNode as any, toNode, refs, component)
        } else if (!isElement(fromNode)) {
          fromNode.nodeValue = toNode.nodeValue
        }
      }
      if (nextSibling) {
        fromParentNode.insertBefore(fromNode, nextSibling)
      }
    },
  })

  if (hasTagName(fromParentNode, 'SELECT')) {
    updateSelected(fromParentNode)
  }
}

function discardKeyedNodesOnly(node: Node) {
  // Never remove a node that was added by an event listener or effect. Any
  // nodes added by a component render will have a position-based key defined
  // automatically if they're missing an explicit key, so this check is
  // sufficient.
  return kAlienElementKey.in(node)
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
