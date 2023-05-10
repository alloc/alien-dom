import type { JSX } from '../types'
import type { DefaultElement } from '../internal/types'
import {
  kAlienElementKey,
  kAlienElementTags,
  kAlienFragment,
  kAlienParentFragment,
  kAlienPlaceholder,
} from '../internal/symbols'
import {
  kCommentNodeType,
  kFragmentNodeType,
  kTextNodeType,
} from '../internal/constants'
import { hasForEach } from '../internal/duck'
import { AlienComponent } from '../internal/component'
import { fromElementThunk } from '../internal/fromElementThunk'
import { currentMode, currentComponent } from '../internal/global'
import { isArrayLike, hasTagName, isElement, isFunction } from './util'
import { isShadowRoot } from './shadow'

export function appendChild(child: JSX.Children, parent: Node, key?: string) {
  if (child === undefined || child === null || child === false) {
    return
  }
  if (isElement(child)) {
    const component = currentComponent.get()

    // The child nodes of a fragment are cached on the fragment itself
    // in case the fragment is cached and reused in a future render.
    if (child.nodeType === kFragmentNodeType) {
      child = prepareFragment(child as any, parent, component)
    }
    // Text nodes cannot have an element key.
    else if (child.nodeType !== kTextNodeType) {
      if (currentMode.is('deref')) {
        child = revertAllPlaceholders(child)
      } else if (component && kAlienElementKey.in(child)) {
        key = kAlienElementKey(child)!

        // Find the element's new version. The element may have been
        // passed by reference, so its new version could exist in a
        // parent component, hence the for loop.
        let newChild: Element | undefined
        for (let c: AlienComponent | null = component; c; c = c.parent) {
          if (!c.newElements || (newChild = c.newElements.get(key))) break
        }

        // Use the new version of the element if it exists.
        if (newChild && child !== newChild) {
          child = newChild
        }
        // If an element reference was cached, there won't exist a new
        // version in the `newElements` map. In this case, let's
        // ensure it's not forgotten by the reference tracker and
        // replace it with a placeholder to skip morphing.
        else if (child.isConnected) {
          component.setRef(key, child as JSX.Element)
          child = getPlaceholder(child)
        }
      }
      if (!kAlienElementKey.in(child)) {
        kAlienElementKey(child, key || '*0')
      }
    }

    appendChildToNode(child, parent)

    // Enable component effects when the parent element is set.
    if (kAlienElementTags.in(child)) {
      const tags = kAlienElementTags(child)!
      queueMicrotask(() => {
        const rootNode =
          (child as ChildNode).nodeType === kFragmentNodeType
            ? kAlienFragment(child)![0]
            : (child as ChildNode)

        if (!rootNode.isConnected) {
          // The element hasn't mounted yet, so we'll have to rely on
          // the component to set an `onMount` listener.
          return
        }

        const components = Array.from(tags.values())
        if (components[0].effects) {
          for (const component of components) {
            component.enable()
          }
        } else {
          // Re-render the top-most component and the updates will
          // trickle down the component tree.
          const topMostComponent = components.at(-1)!
          topMostComponent.enable()
        }
      })
    }
  } else if (isFunction(child)) {
    appendChild(fromElementThunk(child), parent, key)
  } else if (isArrayLike(child)) {
    let children = child
    if (!hasForEach(children)) {
      children = Array.from(children)
    }
    const slotKey = key || ''
    children.forEach((child, i) => {
      const arrayKey = slotKey + '*' + i

      // Fragment children are merged into the nearest ancestor element,
      // so the arrayKey is prepended to avoid conflicts.
      if (isElement(child, kFragmentNodeType)) {
        child.childNodes.forEach(node => {
          const key = kAlienElementKey(node)
          if (typeof key === 'string' && key[0] === '*') {
            kAlienElementKey(node, arrayKey + key)
          }
        })
      }

      appendChild(child as JSX.Children, parent, arrayKey)
    })
  } else if (isShadowRoot(child)) {
    const shadowRoot = (parent as HTMLElement).attachShadow(child.attr)
    appendChild(child.children, shadowRoot)
  } else {
    appendChildToNode(document.createTextNode(String(child)), parent)
  }
}

/**
 * Prepare a fragment node for insertion into the DOM.
 */
export function prepareFragment(
  fragment: DocumentFragment,
  newParent: Node,
  component?: AlienComponent | null
) {
  let childNodes: ChildNode[] | undefined

  if (currentMode.is('deref')) {
    fragment = revertAllPlaceholders(fragment)
  } else if (component && (childNodes = kAlienFragment(fragment))) {
    // For child nodes still in the DOM, generate a placeholder to
    // indicate a no-op. Otherwise, reuse the child node.
    childNodes.forEach(child => {
      if (child.isConnected) {
        child = getPlaceholder(child as any)
      }
      fragment.appendChild(child)
    })
  }

  if (!childNodes) {
    // This is the first time the fragment is being appended, so
    // cache its child nodes.
    childNodes = Array.from(fragment.childNodes)
    kAlienFragment(fragment, childNodes)
  }

  const parentFragment =
    newParent.nodeType === kFragmentNodeType
      ? (newParent as DocumentFragment)
      : undefined

  kAlienParentFragment(fragment, parentFragment)
  return fragment
}

function getPlaceholder(child: Element): DefaultElement {
  let placeholder: any
  if (child.nodeType === kCommentNodeType) {
    placeholder = document.createComment(child.textContent || '')
  } else {
    const tagName = child.tagName.toLowerCase()
    placeholder = child.namespaceURI
      ? document.createElementNS(child.namespaceURI, tagName)
      : document.createElement(tagName)
  }
  kAlienPlaceholder(placeholder, child)
  kAlienElementKey(placeholder, kAlienElementKey(child))
  return placeholder
}

function revertAllPlaceholders<T extends ParentNode | ChildNode>(child: T) {
  child = kAlienPlaceholder<T>(child) || child
  child.childNodes.forEach(grandChild => {
    const oldGrandChild = grandChild
    grandChild = revertAllPlaceholders(grandChild)
    if (oldGrandChild !== grandChild) {
      child.replaceChild(grandChild, oldGrandChild)
    }
  })
  return child
}

function appendChildToNode(child: Node, node: Node) {
  if (hasTagName(node, 'TEMPLATE')) {
    node.content.appendChild(child)
  } else {
    node.appendChild(child)
  }
}
