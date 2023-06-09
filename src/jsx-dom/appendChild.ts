import { isFunction } from '@alloc/is'
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
  hasForEach,
  hasTagName,
  isArrayLike,
  isFragment,
  isNode,
  isTextNode,
} from '../internal/duck'
import { AlienComponent } from '../internal/component'
import { fromElementThunk } from '../internal/fromElementThunk'
import { currentMode, currentComponent } from '../internal/global'
import { isShadowRoot } from './shadow'
import { isComment } from '../internal/duck'

export function appendChild(
  child: JSX.Children,
  parent: ParentNode,
  key?: string
) {
  if (child === undefined || child === null || child === false) {
    return
  }
  if (isNode(child)) {
    const component = currentComponent.get()

    // Text nodes cannot have an element key.
    if (!isTextNode(child)) {
      if (isFragment(child)) {
        child = prepareFragment(child, component)
      } else {
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

        // If the element doesn't have an explicit key, use a generated
        // positional key.
        if (!kAlienElementKey.in(child)) {
          kAlienElementKey(child, key || '*0')
        }
      }

      const parentFragment = isFragment(parent)
        ? (parent as DocumentFragment)
        : undefined

      // Cache the parent fragment on the child element, in case the
      // element is a component's root node, which may be replaced with
      // an incompatible node in the future. If that happens, the parent
      // fragment would need to be updated.
      kAlienParentFragment(child, parentFragment)
    }

    appendChildToNode(child, parent)

    // Enable component effects when the parent element is set.
    if (kAlienElementTags.in(child)) {
      const tags = kAlienElementTags(child)!
      const rootNode = isFragment(child) ? kAlienFragment(child)![0] : child

      queueMicrotask(() => {
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
          topMostComponent.update()
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
      if (isNode(child) && isFragment(child)) {
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

  return fragment
}

function getPlaceholder(child: Element | Comment): DefaultElement {
  let placeholder: any
  if (isComment(child)) {
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
