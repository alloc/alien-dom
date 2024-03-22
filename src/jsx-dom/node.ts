import { isArray, isString } from '@alloc/is'
import { Fragment } from '../components/Fragment'
import { ContextStore } from '../core/context'
import { createOnceEffect } from '../core/effects'
import { ReadonlyRef, isRef, ref } from '../core/observable'
import { attachRef } from '../functions/attachRef'
import {
  applyChildrenProp,
  applyProp,
  applyRefProp,
} from '../internal/applyProp'
import { AlienComponent } from '../internal/component'
import { AlienContextMap, getContext, setContext } from '../internal/context'
import { FragmentKeys, FragmentNodes } from '../internal/fragment'
import { currentComponent, currentEffects } from '../internal/global'
import { HostProps } from '../internal/hostProps'
import {
  kAlienElementKey,
  kAlienElementPosition,
  kAlienFragmentKeys,
  kAlienFragmentNodes,
  kAlienStateless,
} from '../internal/symbols'
import { DefaultElement } from '../internal/types'
import { lastValue } from '../internal/util'
import { SVGNamespace } from '../jsx-dom/jsx-runtime'
import type { JSX } from '../types/jsx'
import { appendChild } from './appendChild'
import { resolveChildren, type ResolvedChild } from './resolveChildren'
import { svgTags } from './svg-tags'
import { noop } from './util'

export type AlienNode =
  | ShadowRootNode
  | DeferredHostNode
  | DeferredCompositeNode

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

export type DeferredChild = ChildNode | AlienNode
export type DeferredChildren =
  | (DeferredChild | null)[]
  | ReadonlyRef<JSX.Children>
  | false
  | null
  | undefined

export interface DeferredCompositeNode extends DeferredNode {
  tag: (props: any) => JSX.ChildrenProp
  children?: ResolvedChild[]
  trace: () => void
}

export type AnyDeferredNode = DeferredHostNode | DeferredCompositeNode

export const isDeferredNode = (node: any): node is AnyDeferredNode =>
  !!node && (node as any)[kAlienNodeType] === kDeferredNodeType

export const isDeferredHostNode = (
  node: DeferredNode
): node is DeferredHostNode => isString(node.tag)

const processDeferredChildren = (children: DeferredChildren | DeferredChild) =>
  children !== false && children != null && !isRef(children)
    ? resolveChildren(children, isArray(children) ? '' : '*0')
    : children

export const deferHostNode = (
  tag: string,
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
  tag: (props: any) => JSX.ChildrenProp,
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
      (children = processDeferredChildren(children)))
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
    // When an effects context is set, prefer to apply the ref prop when that
    // context is enabled. In the context of a component, this means the ref prop
    // will be applied after the component is mounted.
    if (currentEffects.length > 0) {
      createOnceEffect(() => {
        applyRefProp(hostNode, ref, hostProps)
      })
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

  const header = document.createComment(DEV ? 'Fragment' : '')
  const childNodes = new Array(children.length + 1) as FragmentNodes

  childNodes[0] = appendChild(header, fragment) as Comment
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

  const props: any = { ...initialProps }
  const context = new ContextStore(getContext())

  for (const key in initialProps) {
    const initialValue = initialProps[key]
    attachRef(props, key, ref(initialValue))
  }

  const self = new AlienComponent(
    tag,
    props,
    context,
    lastValue(currentComponent)
  )

  // Trigger the initial render.
  self.update()

  return self.rootNode!
}
