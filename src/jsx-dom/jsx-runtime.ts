import { isArray, isFunction, isString } from '@alloc/is'
import { Fragment } from '../components/Fragment'
import { selfUpdating } from '../functions/selfUpdating'
import { applyKeyProp, applyRefProp } from '../internal/applyProp'
import { isNode } from '../internal/duck'
import { enableEffect, getAlienEffects } from '../internal/effects'
import { currentComponent } from '../internal/global'
import { kAlienPureComponent, kAlienSelfUpdating } from '../internal/symbols'
import type { DefaultElement } from '../internal/types'
import { ReadonlyRef, isRef, observe } from '../observable'
import type { JSX } from '../types'
import {
  DeferredNode,
  createDeferredNode,
  createHostNode,
  isDeferredNode,
} from './node'
import { resolveChildren } from './resolveChildren'
import { ShadowRootContext } from './shadow'

export { Fragment }
export type { JSX }

export const SVGNamespace = 'http://www.w3.org/2000/svg'

const selfUpdatingTags = new WeakMap<any, any>()

export { jsx as jsxs }

type Props = {
  ref?: JSX.ElementRef
  children?: JSX.Children | ReadonlyRef<JSX.Children>
}

export function jsx(tag: any, props: Props, key?: JSX.ElementKey): any {
  const component = currentComponent.get()

  const hasImpureTag = typeof tag !== 'string' && !kAlienPureComponent.in(tag)
  if (hasImpureTag && !kAlienSelfUpdating.in(tag)) {
    let selfUpdatingTag = selfUpdatingTags.get(tag)
    if (!selfUpdatingTag) {
      selfUpdatingTag = selfUpdating(tag)
      selfUpdatingTags.set(tag, selfUpdatingTag)
    }
    tag = selfUpdatingTag
  }

  let oldNode: ChildNode | DocumentFragment | undefined
  let node: ChildNode | DocumentFragment | DeferredNode | undefined

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
    if (isDeferred && hasImpureTag) {
      node = createDeferredNode(tag, props)
    } else {
      node = tag(props) as ChildNode | DocumentFragment
    }
  } else if (isString(tag)) {
    const children = isRef(props.children)
      ? props.children
      : resolveChildren(props.children)

    // Host elements are deferred if any of their children are.
    if (isDeferred || (isArray(children) && children.some(isDeferredNode))) {
      node = createDeferredNode(tag, props, children)
    } else {
      node = createHostNode(tag, props, children)
    }
  } else {
    throw Error(`Invalid JSX element type: ${tag}`)
  }

  if (key != null) {
    applyKeyProp(node, key, oldNode, component)
    if (isString(tag) && isNode(node)) {
      applyRefProp(props.ref, node as Element, oldNode)
    }
  }

  return oldNode || node
}

export function enablePropObserver(
  node: DefaultElement,
  prop: string,
  ref: ReadonlyRef,
  applyProp: (node: DefaultElement, newValue: any) => void
) {
  let firstAppliedValue = ref.peek()
  return enableEffect(
    getAlienEffects(node, ShadowRootContext.get()),
    (node: DefaultElement, ref: ReadonlyRef) => {
      const value = ref.peek()
      if (value !== firstAppliedValue) {
        applyProp(node, value)
      }
      firstAppliedValue = undefined
      return observe(ref, newValue => {
        applyProp(node, newValue)
      }).destructor
    },
    0,
    node,
    [ref, prop]
  )
}

/** This is used by JSX SVG elements. */
export const createElement = (
  tag: any,
  { key, ...props }: any,
  ...children: any[]
) => jsx(tag, { ...props, children }, key)
