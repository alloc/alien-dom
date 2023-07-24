import { isArray, isString } from '@alloc/is'
import { Fragment } from '../components/Fragment'
import {
  applyInitialProps,
  applyKeyProp,
  applyProp,
  applyRefProp,
} from '../internal/applyProp'
import { AlienContextMap, setContext } from '../internal/context'
import { hasTagName } from '../internal/duck'
import { currentComponent } from '../internal/global'
import { kAlienElementKey } from '../internal/symbols'
import { SVGNamespace } from '../jsx-dom/jsx-runtime'
import { ReadonlyRef } from '../observable'
import type { JSX } from '../types/jsx'
import { appendChild } from './appendChild'
import type { ResolvedChild } from './resolveChildren'
import { svgTags } from './svg-tags'

/** Special nodes are distinguished by a numeric property of this symbol. */
export const kAlienNodeType = Symbol.for('alien:nodeType')

export const kShadowRootNodeType = 99
export const kDeferredNodeType = 98

export type AlienNode = ShadowRootNode | DeferredNode

export const isAlienNode = (node: any): node is AlienNode =>
  !!(node && node[kAlienNodeType])

export interface ShadowRootNode {
  [kAlienNodeType]: typeof kShadowRootNodeType
  props: ShadowRootInit
  children: ResolvedChild[]
}

export const isShadowRoot = (node: any): node is ShadowRootNode =>
  !!node && node[kAlienNodeType] === kShadowRootNodeType

export function createHostNode(
  tag: string,
  props: any,
  children: ResolvedChild[] | ReadonlyRef<JSX.ChildrenProp>
) {
  const namespaceURI = props.namespaceURI || (svgTags[tag] && SVGNamespace)
  const node = namespaceURI
    ? document.createElementNS(namespaceURI, tag)
    : document.createElement(tag)

  applyInitialProps(node, props)
  applyProp(node, 'children', children)

  // Select any matching <option> elements.
  if (hasTagName(node, 'SELECT') && props.value != null) {
    if (props.multiple === true && isArray(props.value)) {
      const values = (props.value as any[]).map(value => String(value))
      node.querySelectorAll('option').forEach(option => {
        option.selected = values.includes(option.value)
      })
    } else {
      node.value = props.value
    }
  }

  return node
}

export const createTextNode = (text: any) =>
  document.createTextNode(String(text))

export function createFragmentNode(children: ResolvedChild[]) {
  const fragment = document.createDocumentFragment()
  for (const child of children) {
    appendChild(child, fragment)
  }
  return fragment
}

/** A deferred node is one whose component has not executed yet. */
export interface DeferredNode {
  [kAlienNodeType]: typeof kDeferredNodeType
  tag: string | ((props: any) => JSX.ChildrenProp)
  props: any
  children?: ResolvedChild[] | ReadonlyRef<JSX.ChildrenProp>
  context?: AlienContextMap
}

export const isDeferredNode = (node: any): node is DeferredNode =>
  !!node && node[kAlienNodeType] === kDeferredNodeType

export const createDeferredNode = (
  tag: string | ((props: any) => JSX.ChildrenProp),
  props: any,
  children?: ResolvedChild[] | ReadonlyRef<JSX.ChildrenProp> | undefined
): DeferredNode => ({
  [kAlienNodeType]: kDeferredNodeType,
  tag,
  props,
  children,
  context: undefined,
})

export function evaluateDeferredNode(deferredNode: DeferredNode) {
  let node: ChildNode | DocumentFragment

  const { tag, props, context, children } = deferredNode

  if (isString(tag)) {
    node = createHostNode(tag, props, children!)
  } else if (tag === Fragment) {
    node = createFragmentNode(children as ResolvedChild[])
  } else {
    // For consistency, the context used by a deferred component node must match
    // the context that existed when the JSX element was declared.
    const oldContext = context && setContext(context)

    // Self-updating components always return a single DOM node.
    node = tag(props) as any

    if (oldContext) {
      setContext(oldContext)
    }
  }

  const key = kAlienElementKey(deferredNode)
  if (key != null) {
    const component = currentComponent.get()
    applyKeyProp(node, key, undefined, component)
    if (isString(tag)) {
      applyRefProp(props.ref, node as Element)
    }
  }

  return node
}
