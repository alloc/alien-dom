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
import { currentComponent } from '../internal/global'
import {
  kAlienElementKey,
  kAlienElementTags,
  kAlienParentFragment,
} from '../internal/symbols'
import { ref } from '../observable'
import { evaluateDeferredNode, isDeferredNode, isShadowRoot } from './node'
import type { ResolvedChild } from './resolveChildren'
import { ShadowRootContext } from './shadow'

export function appendChild(
  child: ResolvedChild | DocumentFragment,
  parent: ParentNode
) {
  if (isNode(child)) {
    // Text nodes cannot have an element key.
    if (!isTextNode(child)) {
      if (isFragment(child)) {
        child = prepareFragment(child)
      } else if (isElement(child) || isComment(child)) {
        const key = kAlienElementKey(child)
        if (key != null) {
          // Find a pending update for the child node, if any. Give up if we
          // find a parent component isn't being updated.
          let component = currentComponent.get()
          while (component && component.updates) {
            const update = component.updates.get(key)
            if (update) {
              child = evaluateDeferredNode(update)
              break
            }
            component = component.parent
          }
        }
      } else {
        throw Error('Unsupported node type')
      }

      const parentFragment = isFragment(parent)
        ? (parent as DocumentFragment)
        : undefined

      // Cache the parent fragment on the child element, in case the element is
      // a component's root node, which may be replaced with an incompatible
      // node in the future. If that happens, the parent fragment would need to
      // be updated.
      if (kAlienElementTags.in(child)) {
        kAlienParentFragment(child, parentFragment)
      }
    }

    if (hasTagName(parent, 'TEMPLATE')) {
      parent.content.appendChild(child)
    } else {
      parent.appendChild(child)
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
