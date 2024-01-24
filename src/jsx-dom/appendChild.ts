import { getElementKey } from '../functions/getElementKey'
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
import { currentComponent } from '../internal/global'
import { kAlienParentFragment } from '../internal/symbols'
import { morph } from '../morphdom/morph'
import { ref } from '../observable'
import {
  AnyDeferredNode,
  evaluateDeferredNode,
  isDeferredNode,
  isShadowRoot,
} from './node'
import type { ResolvedChild } from './resolveChildren'
import { ShadowRootContext } from './shadow'
import { compareNodeWithTag } from './util'

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
      if (isElement(child) || isComment(child)) {
        const key = getElementKey(child)
        if (key != null) {
          // Find a pending update for the child node, if any. Give up if we
          // find a parent component isn't being updated.
          let update: AnyDeferredNode | undefined
          let component: AlienComponent | null = currentComponent.get()
          for (; component; component = component.parent) {
            if ((update = component.updates?.get(key))) break
          }
          if (update) {
            // It's possible that the child node was created in an earlier
            // render but never appended to the DOM (or it's being moved into a
            // newly created node). In that case, let's morph the existing node
            // instead of creating a new one.
            if (isElement(child) && compareNodeWithTag(child, update.tag)) {
              morph(child, update)
            } else {
              child = evaluateDeferredNode(update)
            }
          }
        }
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
