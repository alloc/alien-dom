/**
 * Adapted from React TypeScript definition
 * @see https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/index.d.ts
 * https://github.com/DefinitelyTyped/DefinitelyTyped/commit/e6491e0d87a72a566c0f6ce61fca2b57199aa172
 */
import type * as CSS from 'csstype'
import type { JSX } from './types/jsx'
import type { ShadowRootContainer } from './types/shadowRoot'
import type { AriaRole, AriaAttributes } from './types/aria'
import type {
  HTMLElementTagNames,
  HTMLAttributes,
  HTMLFactory,
} from './types/html'
import type { SVGAttributes, SVGElementTagNames, SVGFactory } from './types/svg'
import type { AttrWithRef, Attributes } from './types/attr'
import type { DOMAttributes } from './types/dom'

export * from './dist/index'

export type { JSX } from './types/jsx'
export type { HTML, SVG } from './types/extra'
export type { SVGAttributes } from './types/svg'
export type {
  CSSProperties,
  HTMLAttributes,
  HTMLClassAttribute,
  HTMLStyleAttribute,
} from './types/html'

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
  K extends SVGElementTagNames,
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
  K extends SVGElementTagNames,
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

export declare function Fragment(props: {
  children?: JSX.Children | undefined
}): any // DocumentFragment

export declare function ShadowRoot(
  props: ShadowRootInit & {
    // ref?: RefObject<ShadowRoot> | ((value: ShadowRoot) => void)
    children?: JSX.Children | undefined
  }
): ShadowRootContainer

export interface FunctionComponent<P = {}, T extends Element = JSX.Element> {
  (props: PropsWithChildren<P>, context?: any): T | null
  defaultProps?: Partial<P>
  displayName?: string
}

export { FunctionComponent as FC }

export interface ComponentClass<P = {}, T extends Element = JSX.Element> {
  new (props: P, context?: any): Component<P, T>
  defaultProps?: Partial<P> | undefined
  displayName?: string | undefined
}

export declare class Component<P = {}, T extends Element = JSX.Element> {
  constructor(props: PropsWithChildren<P>)
  readonly props: PropsWithChildren<P>
  render(): T | null
}

export { Component as PureComponent }

type PropsWithChildren<P> = P & { children?: JSX.Children | undefined }

export type ComponentType<P = {}, T extends Element = JSX.Element> =
  | ComponentClass<P, T>
  | FunctionComponent<P, T>
