import { isArray, isFunction, isString } from '@alloc/is'
import { Fragment } from '../components/Fragment'
import { currentContext } from '../context'
import { selfUpdating } from '../functions/selfUpdating'
import { applyInitialProps, applyProp } from '../internal/applyProp'
import { hasTagName } from '../internal/duck'
import { enableEffect, getAlienEffects } from '../internal/effects'
import { currentComponent } from '../internal/global'
import {
  kAlienElementKey,
  kAlienElementProps,
  kAlienElementTags,
  kAlienPureComponent,
  kAlienRefProp,
  kAlienSelfUpdating,
} from '../internal/symbols'
import type { DefaultElement } from '../internal/types'
import { ReadonlyRef, observe } from '../observable'
import type { JSX } from '../types'
import { ShadowRootContext } from './appendChild'
import { svgTags } from './svg-tags'

export { Fragment }
export type { JSX }

export const SVGNamespace = 'http://www.w3.org/2000/svg'

const selfUpdatingTags = new WeakMap<any, any>()

export { jsx as jsxs }

export function jsx(tag: any, props: any, key?: JSX.ElementKey) {
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

  // Use the element key to discover the original version of this node. We will
  // return this original node so an API like React's useRef isn't needed.
  let oldNode = key != null && component?.refs?.get(key)

  // Find the component instance associated with the original node, so we can
  // rerender it with the latest props and context (if anything changed).
  if (oldNode && hasImpureTag) {
    const tags = kAlienElementTags(oldNode)
    if (tags) {
      const instance = tags.get(tag)
      if (instance) {
        instance.updateProps(props)
        currentContext.forEach((ref, key) => {
          const targetRef = instance.context.get(key)
          if (targetRef) {
            targetRef.value = ref.peek()
          }
        })
      }
      const updatedNode = instance?.rootNode
      if (updatedNode) {
        component!.setRef(key!, updatedNode)
        return updatedNode
      }
    }
    // Cannot reuse an old node if the tags differ.
    oldNode = undefined
  }

  let node: DefaultElement
  if (isString(tag)) {
    const namespaceURI = props.namespaceURI || (svgTags[tag] && SVGNamespace)
    node = namespaceURI
      ? document.createElementNS(namespaceURI, tag)
      : document.createElement(tag)

    if (oldNode || key == null) {
      kAlienElementProps(node, props)
    } else {
      applyInitialProps(node, props)
    }

    // Unlike other props, children are immediately processed every time.
    applyProp(node, 'children', props.children)

    // Select any matching <option> elements in the first render.
    if (!oldNode && hasTagName(node, 'SELECT') && props.value != null) {
      if (props.multiple === true && isArray(props.value)) {
        const values = (props.value as any[]).map(value => String(value))
        node.querySelectorAll('option').forEach(option => {
          option.selected = values.includes(option.value)
        })
      } else {
        node.value = props.value
      }
    }
  } else if (isFunction(tag)) {
    node = tag(props)
  } else {
    throw new TypeError(`Invalid JSX element type: ${tag}`)
  }

  if (key != null) {
    if (component) {
      // Check for equivalence as the return value of a custom component
      // might be the cached result of an element thunk.
      if (oldNode !== node) {
        component.newElements!.set(key, node as JSX.Element)
      }
      if (oldNode) {
        kAlienElementKey(node, key)
        node = oldNode as any
      }
      component.setRef(key, node)
    } else {
      kAlienElementKey(node, key)
    }
  }

  const oldRefs = oldNode ? kAlienRefProp(oldNode) : undefined
  if (props.ref || oldRefs) {
    const newRefs = new Set<JSX.ElementRef>()
    updateElementRefs(props.ref, node, newRefs, oldRefs)
    kAlienRefProp(node, newRefs)
    oldRefs?.forEach(ref => {
      ref.setElement(null)
    })
  }

  return node
}

export function updateElementRefs(
  ref: JSX.RefProp,
  element: Element | null,
  newRefs: Set<JSX.ElementRef>,
  oldRefs: Set<JSX.ElementRef> | undefined
) {
  if (isArray(ref)) {
    ref.forEach(ref => updateElementRefs(ref, element, newRefs, oldRefs))
  } else if (ref) {
    ref.setElement(element)
    newRefs.add(ref)
    oldRefs?.delete(ref)
  }
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
