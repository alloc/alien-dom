import type { JSX } from './dist/types'
import type { ShadowRootContainer } from './dist/jsx-dom/shadow'
import type {
  HTMLElementTagNames,
  HTMLAttributes,
  HTMLFactory,
} from './dist/types'
import type {
  SVGAttributes,
  SVGElementTagName,
  SVGElementTagNames,
  SVGFactory,
} from './dist/types'
import type { AttrWithRef, Attributes } from './dist/types'
import type { DOMAttributes } from './dist/types'
import type { PropsWithChildren, ComponentType } from './dist/types'

export * from './dist/index'
export { SVGNamespace } from './dist/jsx-dom/jsx-runtime'

export type { JSX } from './dist/types'
export type { HTML, SVG } from './dist/types'
export type { SVGAttributes } from './dist/types'
export type { CSSProperties, DOMClassAttribute } from './dist/types'
export type { HTMLAttributes, HTMLStyleAttribute } from './dist/types'

export type {
  Component,
  ComponentClass,
  ComponentType,
  FunctionComponent,
  PropsWithChildren,
  PureComponent,
} from './dist/types'

// DOM Elements
export declare function createFactory<K extends HTMLElementTagNames>(
  type: K
): HTMLFactory<Extract<HTMLElementTagNameMap[K], HTMLElement>>
export declare function createFactory(type: SVGElementTagNames): SVGFactory
export declare function createFactory<T extends Element>(type: string): T

// DOM Elements
export declare function createElement<
  K extends HTMLElementTagNames,
  T extends HTMLElementTagNameMap[K]
>(
  type: K,
  props?: (HTMLAttributes<T> & AttrWithRef<T>) | null,
  ...children: JSX.Children[]
): T
export declare function createElement<
  K extends SVGElementTagName,
  T extends SVGElementTagNames[K]
>(
  type: K,
  props?: (SVGAttributes<T> & AttrWithRef<T>) | null,
  ...children: JSX.Children[]
): SVGElement
export declare function createElement<T extends Element>(
  type: string,
  props?: (DOMAttributes<T> & AttrWithRef<T>) | null,
  ...children: JSX.Children[]
): T

// Custom components
export declare function createElement<P extends {}, T extends Element>(
  type: ComponentType<P, T>,
  props?: (Attributes & P) | null,
  ...children: JSX.Children[]
): T

export declare function createElement<T extends Element>(
  type: string,
  props?: Attributes | null,
  ...children: JSX.Children[]
): T

// DOM Elements
export declare function jsx<
  K extends HTMLElementTagNames,
  T extends HTMLElementTagNameMap[K]
>(
  type: K,
  props?: PropsWithChildren<HTMLAttributes<T> & AttrWithRef<T>> | null,
  key?: string
): T
export declare function jsx<
  K extends SVGElementTagName,
  T extends SVGElementTagNames[K]
>(
  type: K,
  props?: PropsWithChildren<SVGAttributes<T> & AttrWithRef<T>> | null,
  key?: string
): SVGElement
export declare function jsx<T extends Element>(
  type: string,
  props?: PropsWithChildren<AttrWithRef<T> & DOMAttributes<T>> | null,
  key?: string
): T

// Custom components
export declare function jsx<P extends {}, T extends Element>(
  type: ComponentType<P, T>,
  props?: PropsWithChildren<Attributes & P> | null,
  key?: string
): T

export declare function jsx<T extends Element>(
  type: string,
  props?: PropsWithChildren<Attributes> | null,
  key?: string
): T

export { jsx as jsxs }

export declare function Fragment(props: {
  children?: JSX.Children | undefined
}): any // DocumentFragment

export declare function ShadowRoot(
  props: ShadowRootInit & {
    // ref?: RefObject<ShadowRoot> | ((value: ShadowRoot) => void)
    children?: JSX.Children | undefined
  }
): ShadowRootContainer
