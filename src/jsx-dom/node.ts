import { isArray, isString } from '@alloc/is'
import { Fragment } from '../components/Fragment'
import { createOnceEffect } from '../core/effects'
import { ReadonlyRef, isRef } from '../core/observable'
import {
  applyChildrenProp,
  applyProp,
  applyRefProp,
} from '../internal/applyProp'
import { AlienComponent } from '../internal/component'
import {
  kAlienNodeType,
  kDeferredNodeType,
  kShadowRootNodeType,
  kTemplateNodeType,
} from '../internal/constants'
import { ContextMap, setContext } from '../internal/context'
import { FragmentKeys, FragmentNodes } from '../internal/fragment'
import { currentEffects } from '../internal/global'
import { HostProps } from '../internal/hostProps'
import {
  kAlienElementKey,
  kAlienElementPosition,
  kAlienFragmentKeys,
  kAlienFragmentNodes,
  kAlienStateless,
} from '../internal/symbols'
import { HTMLOrSVGElement } from '../internal/types'
import { lastValue } from '../internal/util'
import { SVGNamespace } from '../jsx-dom/jsx-runtime'
import { FunctionComponent } from '../types'
import type { JSX } from '../types/jsx'
import { appendChild } from './appendChild'
import { resolveChildren, type ResolvedChild } from './resolveChildren'
import { svgTags } from './svg-tags'
import { noop } from './util'

export type AlienNode =
  | ShadowRootNode
  | DeferredHostNode
  | DeferredCompositeNode

export interface ShadowRootNode {
  [kAlienNodeType]: typeof kShadowRootNodeType
  props: ShadowRootInit
  children: ResolvedChild[]
}

export const isShadowRoot = (node: any): node is ShadowRootNode =>
  !!node && node[kAlienNodeType] === kShadowRootNodeType

export interface TemplateNode {
  [kAlienNodeType]: typeof kTemplateNodeType
  template: HTMLOrSVGElement
}

export const isTemplateNode = (node: any): node is TemplateNode =>
  !!node && node[kAlienNodeType] === kTemplateNodeType

export type HostNodeTag = string | TemplateNode

/** A deferred node is one whose component has not executed yet. */
export interface DeferredNode {
  [kAlienNodeType]: typeof kDeferredNodeType
  tag: HostNodeTag | FunctionComponent<any>
  props: any
  context: ContextMap | undefined
}

export interface DeferredHostNode extends DeferredNode {
  tag: HostNodeTag
  ref: JSX.RefProp<any>
  children: DeferredChildren
  namespaceURI: string | undefined
}

export type DeferredChild = ChildNode | AlienNode
export type DeferredChildren =
  | (DeferredChild | null)[]
  | ReadonlyRef<JSX.Children>
  | false
  | null
  | undefined

export interface DeferredCompositeNode extends DeferredNode {
  tag: FunctionComponent<any>
  children?: ResolvedChild[]
  trace: () => void
}

export type AnyDeferredNode = DeferredHostNode | DeferredCompositeNode

export const isDeferredNode = (node: any): node is AnyDeferredNode =>
  !!node && node[kAlienNodeType] === kDeferredNodeType

export const isDeferredHostNode = (
  node: DeferredNode
): node is DeferredHostNode => isString(node.tag) || isTemplateNode(node.tag)

const processDeferredChildren = (children: DeferredChildren | DeferredChild) =>
  children !== false && children != null && !isRef(children)
    ? resolveChildren(children, isArray(children) ? '' : '*0')
    : children

export const deferHostNode = (
  tag: HostNodeTag,
  { ref, children, namespaceURI, ...props }: any
): DeferredHostNode => ({
  [kAlienNodeType]: kDeferredNodeType,
  tag,
  ref,
  props,
  children: processDeferredChildren(children),
  namespaceURI,
  context: undefined,
})

export const deferCompositeNode = (
  tag: FunctionComponent<any>,
  props: any,
  children?: ResolvedChild[]
): DeferredCompositeNode => ({
  [kAlienNodeType]: kDeferredNodeType,
  tag,
  props,
  children,
  context: undefined,
  trace: DEV
    ? (({ stack }: Error) => console.log.bind(console, stack))(
        Error(tag.name + ' node was declared here ↓')
      )
    : noop,
})

export function evaluateDeferredNode(node: AnyDeferredNode) {
  const key = kAlienElementKey(node)
  const position = kAlienElementPosition(node)

  let hostNode: ChildNode | DocumentFragment
  if (isDeferredHostNode(node)) {
    hostNode = createHostNode(node)
  } else if (node.tag === Fragment) {
    hostNode = createFragmentNode(node.children!, kAlienFragmentKeys(node)!)
  } else {
    const oldContext = node.context && setContext(node.context)
    hostNode = createCompositeNode(node.tag, node.props)
    if (oldContext) {
      setContext(oldContext)
    }
  }

  kAlienElementKey(hostNode, key)
  kAlienElementPosition(hostNode, position)
  return hostNode
}

export function createHostNode(
  tag: HostNodeTag | DeferredHostNode,
  props?: any,
  ref?: JSX.RefProp<any>,
  children?: DeferredChildren,
  namespaceURI?: string
): Element {
  // If a deferred host node is passed, we can skip the restructuring of the
  // props object and the resolveChildren call, as those tasks were done by the
  // deferHostNode constructor.
  isString(tag) || isTemplateNode(tag)
    ? (({ ref, children, namespaceURI, ...props } = props),
      (children = processDeferredChildren(children)))
    : ({ tag, props, ref, children, namespaceURI } = tag)

  const hostNode = (
    isTemplateNode(tag)
      ? tag.template.cloneNode(true)
      : (namespaceURI ||= svgTags[tag] && SVGNamespace)
      ? document.createElementNS(namespaceURI, tag)
      : document.createElement(tag)
  ) as HTMLOrSVGElement

  const hostProps = new HostProps(hostNode)

  for (const prop in props) {
    applyProp(hostNode, prop, props[prop], hostProps)
  }
  if (children) {
    applyChildrenProp(hostNode, children, hostProps)
  }
  if (ref) {
    // When an effects context is set, prefer to apply the ref prop when that
    // context is enabled. In the context of a component, this means the ref
    // prop will be applied after the component is mounted. It needs to be
    // applied before any other effects.
    if (lastValue(currentEffects)) {
      createOnceEffect(() => {
        applyRefProp(hostNode, ref, hostProps)
      }, true /* prepend */)
    } else {
      applyRefProp(hostNode, ref, hostProps)
    }
  }

  return hostNode
}

export const createTextNode = (text: any) =>
  document.createTextNode(String(text))

export function createFragmentNode(
  children: ResolvedChild[],
  childKeys: FragmentKeys
) {
  const fragment = document.createDocumentFragment()

  const head = document.createTextNode('')
  const childNodes = new Array(children.length + 1) as FragmentNodes

  childNodes[0] = appendChild(head, fragment) as Comment
  for (let i = 0; i < children.length; i++) {
    childNodes[i + 1] = appendChild(children[i], fragment)
  }

  kAlienFragmentNodes(fragment, childNodes)
  kAlienFragmentKeys(fragment, childKeys)
  return fragment
}

export function createCompositeNode(
  tag: (props: any) => JSX.ChildrenProp,
  initialProps: any
) {
  if (kAlienStateless.in(tag)) {
    return tag(initialProps) as ChildNode | DocumentFragment
  }
  const self = new AlienComponent(tag, initialProps)
  return self.rootNode!
}
