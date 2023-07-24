import { AlienComponent } from '../internal/component'
import { setContext } from '../internal/context'
import {
  hasTagName,
  isComment,
  isElement,
  isFragment,
  isNode,
  isTextNode,
} from '../internal/duck'
import { prepareFragment } from '../internal/fragment'
import { currentComponent, currentMode } from '../internal/global'
import { getPlaceholder, revertAllPlaceholders } from '../internal/placeholder'
import {
  kAlienElementKey,
  kAlienElementTags,
  kAlienFragment,
  kAlienParentFragment,
} from '../internal/symbols'
import { DefaultElement } from '../internal/types'
import { ref } from '../observable'
import {
  DeferredNode,
  evaluateDeferredNode,
  isDeferredNode,
  isShadowRoot,
} from './node'
import type { ResolvedChild } from './resolveChildren'
import { ShadowRootContext } from './shadow'

export function appendChild(
  child: ResolvedChild | DocumentFragment,
  parent: ParentNode
) {
  if (isNode(child)) {
    const component = currentComponent.get()

    // Text nodes cannot have an element key.
    if (!isTextNode(child)) {
      if (isFragment(child)) {
        child = prepareFragment(child, component)
      } else {
        if (!isElement(child) && !isComment(child)) {
          throw Error('Unsupported node type')
        }
        if (currentMode.is('deref')) {
          child = revertAllPlaceholders(child)
        } else if (component) {
          const key = kAlienElementKey(child)
          if (key != null) {
            // Find the element's new version. The element may have been passed
            // by reference, so its new version could exist in a parent
            // component, hence the for loop.
            let newChild: DefaultElement | DeferredNode | undefined
            for (let c: AlienComponent | null = component; c; c = c.parent) {
              if (!c.newElements || (newChild = c.newElements.get(key))) break
            }

            // Use the new version of the element if it exists.
            if (newChild && child !== newChild) {
              child = newChild

              if (isDeferredNode(child)) {
                child = evaluateDeferredNode(child)
              }
            }
            // If an element reference was cached, there won't exist a new
            // version in the `newElements` map. In this case, let's ensure it's
            // not forgotten by the reference tracker and replace it with a
            // placeholder to skip morphing.
            else if (child.isConnected) {
              component.setRef(key, child)
              child = getPlaceholder(child)
            }
          }
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

    if (hasTagName(parent, 'TEMPLATE')) {
      parent.content.appendChild(child)
    } else {
      parent.appendChild(child)
    }

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
  } else if (isDeferredNode(child)) {
    child = evaluateDeferredNode(child)
    appendChild(child, parent)
  } else if (isShadowRoot(child)) {
    const shadowRoot = (parent as HTMLElement).attachShadow(child.props)
    const ancestorShadowRoot = setContext(
      ShadowRootContext,
      ref<ShadowRoot | undefined>(shadowRoot)
    )
    try {
      for (const shadowChild of child.children) {
        appendChild(shadowChild, shadowRoot)
      }
    } finally {
      setContext(ShadowRootContext, ancestorShadowRoot)
    }
  }
}
