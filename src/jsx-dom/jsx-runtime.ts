import { isFunction, isString } from '@alloc/is'
import { Falsy } from '@alloc/types'
import { Fragment } from '../components/Fragment'
import { applyKeyProp } from '../internal/applyProp'
import { wrapWithFragment } from '../internal/fragment'
import { currentComponent } from '../internal/global'
import { kAlienStateless } from '../internal/symbols'
import { lastValue } from '../internal/util'
import type { JSX } from '../types'
import {
  AnyDeferredNode,
  createCompositeNode,
  createHostNode,
  deferCompositeNode,
  deferHostNode,
} from './node'
import { compareNodeWithTag } from './util'

export { Fragment }
export type { JSX }

/**
 * When the JSX is compiled, this symbol gets passed as the `key` prop of any
 * unkeyed JSX element that's created outside of a component. It forces the
 * runtime to return a DOM element from the compiled `jsx` call.
 *
 * This was added to allow user-defined, "helper" functions that create JSX
 * elements to be called by a component while rendering. Without this feature,
 * the runtime would return a virtual node instead of a DOM element, which would
 * prevent natural DOM manipulation.
 */
export const FORCE_DOM = Symbol.for('alien:force-dom')

export const SVGNamespace = 'http://www.w3.org/2000/svg'

export { jsx as jsxs }

type Props = {
  ref?: JSX.ElementRef
  children?: JSX.ChildrenProp
}

export function jsx(
  tag: string | ((props: any) => JSX.ChildrenProp) | Falsy,
  props: Props,
  key?: JSX.ElementKey | typeof FORCE_DOM
): any {
  if (!tag) {
    return null
  }

  let shouldDefer: boolean | undefined
  let oldNode: ChildNode | DocumentFragment | undefined
  let node: ChildNode | DocumentFragment | AnyDeferredNode | undefined

  const component = lastValue(currentComponent)
  if (component) {
    // Use the JSX element's key to locate an existing DOM node. We will return
    // this node so the component can reference it without misdirection.
    if (isElementKey(key) && component.nodes) {
      oldNode = component.nodes.get(key)
      if (oldNode && !compareNodeWithTag(oldNode, tag)) {
        oldNode = undefined
      }
    }

    // Defer the creation of any DOM nodes until the morphing phase, unless the
    // JSX element has a key without a DOM node.
    shouldDefer = key !== FORCE_DOM && (oldNode != null || key == null)
  }

  if (isFunction(tag)) {
    if (tag !== Fragment) {
      // Stateless components (like context providers and shadow roots) are
      // never deferred, since they operate under the assumption that they run
      // immediately when they're declared.
      node =
        shouldDefer && !kAlienStateless.in(tag)
          ? deferCompositeNode(tag, props)
          : createCompositeNode(tag, props)
    } else {
      node = shouldDefer
        ? wrapWithFragment(props.children, true)
        : Fragment(props as any)
    }
  } else if (isString(tag)) {
    if (shouldDefer) {
      node = deferHostNode(tag, props)
    } else {
      node = createHostNode(tag, props)
    }
  } else {
    throw Error(`Invalid JSX element type: ${tag}`)
  }

  if (isElementKey(key)) {
    applyKeyProp(node, key, oldNode, component)
  }

  return oldNode || node
}

function isElementKey(key: any): key is JSX.ElementKey {
  return key != null && key !== FORCE_DOM
}

/** This is used by JSX SVG elements. */
export function createElement(tag: any, props: any, ...children: any[]) {
  let key: JSX.ElementKey | undefined
  props && ({ key, ...props } = props)
  return jsx(
    tag,
    children.length
      ? { ...props, children: children.length > 1 ? children : children[0] }
      : props || {},
    key
  )
}
