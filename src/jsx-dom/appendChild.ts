import { ref } from '../core/observable'
import { setContext } from '../internal/context'
import {
  hasTagName,
  isComment,
  isElement,
  isFragment,
  isNode,
  isTextNode,
} from '../internal/duck'
import { ShadowRootContext } from '../internal/shadow'
import { kAlienParentFragment } from '../internal/symbols'
import { evaluateChild } from './evaluateChild'
import { evaluateDeferredNode, isDeferredNode, isShadowRoot } from './node'
import type { ResolvedChild } from './resolveChildren'

export function appendChild(
  child: ResolvedChild,
  parent: ParentNode
): ChildNode | undefined

export function appendChild(
  child: ResolvedChild | DocumentFragment,
  parent: ParentNode
): ChildNode | DocumentFragment | undefined

export function appendChild(
  child: ResolvedChild | DocumentFragment,
  parent: ParentNode
): ChildNode | DocumentFragment | undefined {
  if (child === null) {
    return
  }

  if (isNode(child)) {
    // Text nodes cannot have an element key.
    if (!isTextNode(child)) {
      // Apply a pending update associated with the DOM node. Comment nodes
      // could have an associated fragment update.
      if (isElement(child) || isComment(child)) {
        child = evaluateChild(child)
      } else if (!isFragment(child)) {
        throw Error('Unsupported node type')
      }

      // Cache the parent fragment on the child element, in case the element is
      // a component's root node, which may be replaced with an incompatible
      // node in the future. If that happens, the parent fragment would need to
      // be updated.
      if (isFragment(parent) && !kAlienParentFragment(child)) {
        kAlienParentFragment(child, parent)
      }
    }

    if (hasTagName(parent, 'TEMPLATE')) {
      parent.content.appendChild(child)
    } else {
      parent.appendChild(child)
    }
    return child
  }

  if (isDeferredNode(child)) {
    child = evaluateDeferredNode(child)
    return appendChild(child, parent)
  }

  if (isShadowRoot(child)) {
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
