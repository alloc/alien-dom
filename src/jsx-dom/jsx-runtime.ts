import { isFunction, isString } from '@alloc/is'
import { Fragment } from '../components/Fragment'
import { selfUpdating } from '../functions/selfUpdating'
import { applyKeyProp } from '../internal/applyProp'
import { wrapWithFragment } from '../internal/fragment'
import { currentComponent } from '../internal/global'
import { kAlienPureComponent, kAlienSelfUpdating } from '../internal/symbols'
import type { JSX } from '../types'
import {
  AnyDeferredNode,
  createHostNode,
  deferCompositeNode,
  deferHostNode,
} from './node'

export { Fragment }
export type { JSX }

export const SVGNamespace = 'http://www.w3.org/2000/svg'

export { jsx as jsxs }

type Props = {
  ref?: JSX.ElementRef
  children?: JSX.ChildrenProp
}

export function jsx(tag: any, props: Props, key?: JSX.ElementKey): any {
  const component = currentComponent.get()

  const hasImpureTag = typeof tag !== 'string' && !kAlienPureComponent.in(tag)
  if (hasImpureTag && tag !== Fragment) {
    let selfUpdatingTag = kAlienSelfUpdating(tag)
    if (!selfUpdatingTag) {
      selfUpdatingTag = selfUpdating(tag)
      kAlienSelfUpdating(tag, selfUpdatingTag)
    }
    tag = selfUpdatingTag
  }

  let oldNode: ChildNode | DocumentFragment | undefined
  let node: ChildNode | DocumentFragment | AnyDeferredNode | undefined

  // Use the element key to discover the original version of this node. We will
  // return this original node so an API like React's useRef isn't needed.
  if (key != null && component?.refs) {
    oldNode = component.refs.get(key)
  }

  // Defer DOM updates until the morphing phase. If a JSX element has a key but
  // no previous node, the DOM node is created immediately. If a JSX element
  // doesn't have a key, the DOM node won't be created until required.
  const isDeferred = component != null && (oldNode != null || key == null)

  if (isFunction(tag)) {
    // Pure components are never deferred.
    if (hasImpureTag && isDeferred) {
      if (tag !== Fragment) {
        node = deferCompositeNode(tag, props)
      } else {
        node = wrapWithFragment(props.children, undefined, true)
      }
    } else {
      node = tag(props) as Exclude<typeof node, undefined>
    }
  } else if (isString(tag)) {
    if (isDeferred) {
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
