import { isFunction } from '@alloc/is'
import { Fragment } from '../components/Fragment'
import { ContextStore } from '../core/context'
import { isChildrenFragment } from '../hooks'
import { isElement, isFragment, isNode, isTextNode } from '../internal/duck'
import { updateParentFragment, wrapWithFragment } from '../internal/fragment'
import { fromElementThunk } from '../internal/fromElementThunk'
import { currentComponent } from '../internal/global'
import { NodeStore } from '../internal/nodeStore'
import {
  kAlienElementKey,
  kAlienElementTags,
  kAlienFragmentNodes,
  kAlienParentFragment,
} from '../internal/symbols'
import { AnyElement } from '../internal/types'
import { compareNodeWithTag, lastValue } from '../internal/util'
import {
  evaluateDeferredNode,
  isDeferredNode,
  isShadowRoot,
} from '../jsx-dom/node'
import { UnresolvedChild } from '../jsx-dom/resolveChildren'
import { morph } from '../morphdom/morph'
import { morphComposite } from '../morphdom/morphComposite'
import { morphFragment } from '../morphdom/morphFragment'
import { JSX } from '../types/jsx'
import { unmount } from './unmount'

/**
 * This is the exact same function used by JSX components to resolve their
 * return value into a single DOM node and apply updates across renders.
 */
export function morphRootNode(
  rootNode: ChildNode | DocumentFragment | null,
  newRootNode: UnresolvedChild,
  rootKey: JSX.ElementKey | undefined,
  context?: ContextStore,
  nodeStore?: NodeStore | null
): ChildNode | DocumentFragment {
  if (isFunction(newRootNode)) {
    newRootNode = fromElementThunk(newRootNode)
  }

  // TODO: support ShadowRoot component roots?
  if (isShadowRoot(newRootNode)) {
    throw Error('ShadowRoot cannot be returned by component')
  }

  if (isChildrenFragment(newRootNode)) {
    newRootNode = newRootNode.fragment
  }

  // When this is true, a comment node will be used as a placeholder, so
  // the component can insert a node later.
  let placeholder: Text | false

  if (rootNode) {
    placeholder = isTextNode(rootNode) && rootNode

    // The render function might return an element reference.
    if (nodeStore && rootNode === newRootNode) {
      const key = kAlienElementKey(rootNode)
      const update = key != null && nodeStore.getNodeUpdateForKey(key)
      if (update) {
        newRootNode = update
      }
    }
  }

  // When this is true, the root node has been updated in place.
  let updated: boolean | undefined

  if (rootNode !== newRootNode) {
    if (newRootNode != null) {
      if (isNode(newRootNode)) {
        if (
          DEV &&
          isFragment(newRootNode) &&
          !kAlienFragmentNodes(newRootNode)
        ) {
          throw Error(
            'DocumentFragment must be created with JSX to be returned by a component.'
          )
        }
      }
      // When a non-node is returned, wrap it in a fragment.
      else if (!isDeferredNode(newRootNode)) {
        newRootNode = wrapWithFragment(newRootNode, rootNode != null, context)
      }

      // Update the root node if possible.
      if (
        rootNode &&
        isDeferredNode(newRootNode) &&
        rootKey === kAlienElementKey(newRootNode) &&
        compareNodeWithTag(rootNode, newRootNode.tag)
      ) {
        if (isFunction(newRootNode.tag)) {
          if (newRootNode.tag === Fragment) {
            morphFragment(rootNode as any, newRootNode)
          } else {
            morphComposite(rootNode, newRootNode as any)
          }
          updated = true
        } else if (isElement(rootNode)) {
          morph(rootNode, newRootNode)
          updated = true
        }
      }
    }

    // Initialize or replace the root node.
    if (!updated) {
      if (isDeferredNode(newRootNode)) {
        // The next root node must be a DOM node.
        newRootNode = evaluateDeferredNode(newRootNode)
      }

      if (
        newRootNode &&
        isFragment(newRootNode) &&
        !newRootNode.childNodes.length
      ) {
        // Empty fragments disappear.
        newRootNode = null
      }

      // Use a comment node as a placeholder if nothing was produced.
      if (!newRootNode) {
        placeholder ||= document.createTextNode('')
        newRootNode = placeholder
      }

      // Replace the old root node if one exists and wasn't replaced by a
      // deeper component already.
      if (rootNode && !fromSameDeeperComponent(rootNode, newRootNode)) {
        let replacedNode = rootNode
        if (isFragment(replacedNode)) {
          // Remove any nodes owned by the old fragment.
          const replacedNodes = kAlienFragmentNodes(replacedNode)!
          if (replacedNodes[0].parentElement) {
            replacedNodes.slice(1).forEach(node => unmount(node))
          }
          // Replace the fragment's first node, which is always an empty text
          // node called the "head node".
          replacedNode = replacedNodes[0] as Text
        }

        // If a component is currently rendering, assume it shouldn't be
        // unmounted when the replacedNode is unmounted.
        const component = lastValue(currentComponent)

        // We can't logically replace a node with no parent.
        if (replacedNode.parentElement) {
          replacedNode.replaceWith(newRootNode)
          unmount(replacedNode, true, component)
        } else if (DEV) {
          // TODO: schedule a replaceWith call upon being mounted?
          const name = component ? `Component "${component.name}"` : `Element`
          console.error(
            `${name} was updated before its initial node could be added to the DOM, resulting in a failed update!`
          )
        }
      }

      // When a composite element is wrapped with a JSX fragment (the "parent
      // fragment"), the fragment's bookkeeping must be updated whenever the
      // component's root node is replaced.
      if (rootNode) {
        const parentFragment = kAlienParentFragment(rootNode)
        if (parentFragment) {
          kAlienParentFragment(newRootNode, parentFragment)
          updateParentFragment(
            parentFragment,
            kAlienFragmentNodes(rootNode) || [rootNode as AnyElement],
            kAlienFragmentNodes(newRootNode) || [newRootNode as AnyElement]
          )
        }
      }

      rootNode = newRootNode
    }
  } else if (!rootNode) {
    // Set a placeholder as the initial root node.
    rootNode = document.createTextNode('')
  }

  // Sanity check.
  if (DEV && !rootNode) {
    throw Error('Component failed to render a node')
  }

  return rootNode!
}

/**
 * If the current node and the new node are both returned by the
 * same component instance, we should avoid any mutation, since
 * that's been handled by the deeper component.
 *
 * This function assumes `newRootNode` hasn't had the caller added
 * to its `kAlienElementTags` map yet.
 */
function fromSameDeeperComponent(
  prev: ChildNode | DocumentFragment,
  next: ChildNode | DocumentFragment
) {
  if (prev === next) {
    return true
  }
  const nextTags = kAlienElementTags(next)
  if (nextTags) {
    const prevTags = kAlienElementTags(prev)!
    for (const [prevTag, prevInstance] of prevTags) {
      for (const [nextTag, nextInstance] of nextTags) {
        return nextTag === prevTag && nextInstance === prevInstance
      }
    }
  }
  return false
}
