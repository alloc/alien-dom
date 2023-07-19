import type {
  Attributes,
  AttrWithRef,
  DOMAttributes,
  FunctionComponent,
  HTMLAttributes,
  HTMLElementTagNames,
  JSX,
  PropsWithChildren,
  SVGAttributes,
  SVGElementTagName,
  SVGElementTagNames,
} from './dist/types'
import './observable'

export * from './dist/index'
export { SVGNamespace } from './dist/jsx-dom/jsx-runtime'

export type {
  CSSProperties,
  DOMClassAttribute,
  FunctionComponent,
  HTML,
  HTMLAttributes,
  HTMLStyleAttribute,
  JSX,
  PropsWithChildren,
  SVG,
  SVGAttributes,
} from './dist/types'

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
  type: FunctionComponent<P, T>,
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
): any // ShadowRootContainer
