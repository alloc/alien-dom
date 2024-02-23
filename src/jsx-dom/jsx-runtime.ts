import { isFunction, isString } from '@alloc/is'
import { Fragment } from '../components/Fragment'
import { selfUpdating } from '../functions/selfUpdating'
import { applyKeyProp } from '../internal/applyProp'
import { wrapWithFragment } from '../internal/fragment'
import { currentComponent } from '../internal/global'
import { kAlienPureComponent, kAlienSelfUpdating } from '../internal/symbols'
import { lastValue } from '../internal/util'
import type { JSX } from '../types'
import {
  AnyDeferredNode,
  createHostNode,
  deferCompositeNode,
  deferHostNode,
} from './node'
import { compareNodeWithTag } from './util'

export { Fragment }
export type { JSX }

export const SVGNamespace = 'http://www.w3.org/2000/svg'

export { jsx as jsxs }

type Props = {
  ref?: JSX.ElementRef
  children?: JSX.ChildrenProp
}

export function jsx(tag: any, props: Props, key?: JSX.ElementKey): any {
  if (!tag) {
    return null
  }

  const hasImpureTag = !isString(tag) && !kAlienPureComponent.in(tag)
  if (hasImpureTag && tag !== Fragment) {
    let selfUpdatingTag = kAlienSelfUpdating(tag)
    if (!selfUpdatingTag) {
      selfUpdatingTag = selfUpdating(tag)
      kAlienSelfUpdating(tag, selfUpdatingTag)
    }
    tag = selfUpdatingTag
  }

  let shouldDefer: boolean | undefined
  let oldNode: ChildNode | DocumentFragment | undefined
  let node: ChildNode | DocumentFragment | AnyDeferredNode | undefined

  const component = lastValue(currentComponent)
  if (component) {
    // Use the JSX element's key to locate an existing DOM node. We will return
    // this node so the component can reference it without misdirection.
    if (key != null && component.refs) {
      oldNode = component.refs.get(key)
      if (oldNode && !compareNodeWithTag(oldNode, tag)) {
        oldNode = undefined
      }
    }

    // Defer the creation of any DOM nodes until the morphing phase, unless the
    // JSX element has a key without a DOM node.
    shouldDefer = oldNode != null || key == null
  }

  if (isFunction(tag)) {
    // Pure components are never deferred.
    if (hasImpureTag && shouldDefer) {
      if (tag !== Fragment) {
        node = deferCompositeNode(tag, props)
      } else {
        node = wrapWithFragment(props.children, undefined, true)
      }
    } else {
      node = tag(props) as Exclude<typeof node, undefined>
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

  if (key != null) {
    applyKeyProp(node, key, oldNode, component)
  }

  return oldNode || node
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
