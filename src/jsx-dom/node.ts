import { isString } from '@alloc/is'
import { Fragment } from '../components/Fragment'
import {
  applyChildrenProp,
  applyProp,
  applyRefProp,
} from '../internal/applyProp'
import { AlienContextMap, setContext } from '../internal/context'
import { HostProps } from '../internal/hostProps'
import { kAlienElementKey } from '../internal/symbols'
import { DefaultElement } from '../internal/types'
import { SVGNamespace } from '../jsx-dom/jsx-runtime'
import { ReadonlyRef, isRef } from '../observable'
import type { JSX } from '../types/jsx'
import { appendChild } from './appendChild'
import { resolveChildren, type ResolvedChild } from './resolveChildren'
import { svgTags } from './svg-tags'

export type AlienNode =
  | ShadowRootNode
  | DeferredHostNode
  | DeferredComponentNode

/** Special nodes are distinguished by a numeric property of this symbol. */
export const kAlienNodeType = Symbol.for('alien:nodeType')

export const kShadowRootNodeType = 99
export const kDeferredNodeType = 98

export interface ShadowRootNode {
  [kAlienNodeType]: typeof kShadowRootNodeType
  props: ShadowRootInit
  children: ResolvedChild[]
}

export const isShadowRoot = (node: any): node is ShadowRootNode =>
  !!node && node[kAlienNodeType] === kShadowRootNodeType

/** A deferred node is one whose component has not executed yet. */
export interface DeferredNode {
  [kAlienNodeType]: typeof kDeferredNodeType
  tag: string | ((props: any) => JSX.ChildrenProp)
  props: any
  context: AlienContextMap | undefined
}

export interface DeferredHostNode extends DeferredNode {
  tag: string
  ref: JSX.RefProp<any>
  children: DeferredChildren
  namespaceURI: string | undefined
}

export type DeferredChildren =
  | ResolvedChild[]
  | ReadonlyRef<JSX.Children>
  | false
  | undefined

export interface DeferredComponentNode extends DeferredNode {
  tag: (props: any) => JSX.ChildrenProp
  children?: ResolvedChild[]
}

export type AnyDeferredNode = DeferredHostNode | DeferredComponentNode

export const isDeferredNode = (node: any): node is AnyDeferredNode =>
  !!node && (node as any)[kAlienNodeType] === kDeferredNodeType

export const isDeferredHostNode = (
  node: DeferredNode
): node is DeferredHostNode => isString(node.tag)

export const deferHostNode = (
  tag: string,
  { ref, children, namespaceURI, ...props }: any
): DeferredHostNode => ({
  [kAlienNodeType]: kDeferredNodeType,
  tag,
  ref,
  props,
  children:
    children && (isRef(children) ? children : resolveChildren(children)),
  namespaceURI,
  context: undefined,
})

export const deferComponentNode = (
  tag: (props: any) => JSX.ChildrenProp,
  props: any,
  children?: ResolvedChild[]
): DeferredComponentNode => ({
  [kAlienNodeType]: kDeferredNodeType,
  tag,
  props,
  children,
  context: undefined,
})

export function evaluateDeferredNode(node: AnyDeferredNode) {
  const key = kAlienElementKey(node)

  let hostNode: Element | Comment | DocumentFragment
  if (isDeferredHostNode(node)) {
    hostNode = createHostNode(node)
  } else if (node.tag === Fragment) {
    hostNode = createFragmentNode(node.children as ResolvedChild[])
  } else {
    // For consistency, the context used by a deferred component node must match
    // the context that existed when the JSX element was declared.
    const oldContext = node.context && setContext(node.context)

    // Self-updating components always return a single DOM node.
    hostNode = node.tag(node.props) as any

    if (oldContext) {
      setContext(oldContext)
    }
  }

  kAlienElementKey(hostNode, key)
  return hostNode
}

export function createHostNode(
  tag: string | DeferredHostNode,
  props?: any,
  ref?: JSX.RefProp<any>,
  children?: DeferredChildren,
  namespaceURI?: string
): Element {
  // If a deferred host node is passed, we can skip the restructuring of the
  // props object and the resolveChildren call, as those tasks were done by the
  // deferHostNode constructor.
  isString(tag)
    ? (({ ref, children, namespaceURI, ...props } = props),
      (children = children && !isRef(children) && resolveChildren(children)))
    : ({ tag, props, ref, children, namespaceURI } = tag)

  const hostNode = (
    (namespaceURI ||= svgTags[tag] && SVGNamespace)
      ? document.createElementNS(namespaceURI, tag)
      : document.createElement(tag)
  ) as DefaultElement

  const hostProps = new HostProps(hostNode)

  for (const prop in props) {
    applyProp(hostNode, prop, props[prop], hostProps)
  }
  if (children) {
    applyChildrenProp(hostNode, children, hostProps)
  }
  if (ref) {
    applyRefProp(hostNode, ref, hostProps)
  }

  return hostNode
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
