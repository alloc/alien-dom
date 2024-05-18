import type { FlatReadonlyRef, ReadonlyRef } from '../core/observable'
import type { ChildrenFragment } from '../hooks/useChildren'
import type { AnyElement } from '../internal/types'
import type { AlienNode } from '../jsx-dom/node'
import { FunctionComponent } from './component'
import { CSSAttributes } from './css'
import type { EventHandler } from './dom'
import type {
  HTMLAttributes,
  HTMLAttributesByTagName,
  HTMLClassAttribute,
  HTMLClassPrimitiveAttribute,
  HTMLDatasetAttribute,
  HTMLStyleAttribute,
  HTMLTagName,
} from './html'
import { SVGAttributes, SVGAttributesByTagName, SVGTagName } from './svg'

type Thunk<T = any> = () => T
type Thunkable<T> = T | Thunk<T>

export declare namespace JSX {
  type Element = HTMLElement
  type ElementKey = string | number
  type ElementRef<Element extends AnyElement = AnyElement> = {
    setElement(element: Element | null): void
  }

  type RefProp<Element extends AnyElement = AnyElement> =
    | readonly (RefProp<Element> | false | null | undefined)[]
    | ElementRef<Element>
    | false
    | null
    | undefined

  type Children =
    | ChildNode
    | DocumentFragment
    | ChildrenFragment
    | ArrayLike<Children>
    | string
    | number
    | boolean
    | null
    | undefined

  type ChildrenProp = Thunkable<Children | ReadonlyRef<Children>>

  /**
   * This type represents a valid component result (except for null).
   */
  type ElementLike = ChildNode | AlienNode | DocumentFragment | ChildrenFragment

  /**
   * Use this type if your component has a prop that can be a single JSX
   * element. Your component should call `useChildren` on this prop to get the
   * materialized DOM node.
   */
  type ElementProp = Thunkable<ElementLike>

  /**
   * Use this type if your component has a prop that can be a single JSX element
   * or an array of JSX elements. Your component should call `useChildren` on
   * this prop to get the materialized DOM nodes.
   */
  type ElementsProp = Thunkable<ElementLike | ElementLike[]>

  type ElementType = keyof IntrinsicElements | FunctionComponent<any>

  type HTMLClassArrayProp = readonly (
    | FlatReadonlyRef<HTMLClassProp>
    | HTMLClassProp
  )[]

  type HTMLClassMapProp = {
    [key: string]: boolean | ReadonlyRef<boolean>
  }

  type HTMLClassProp =
    | HTMLClassArrayProp
    | HTMLClassMapProp
    | HTMLClassPrimitiveAttribute extends infer HTMLClassProp
    ? ReadonlyRef<HTMLClassProp> | HTMLClassProp
    : never

  type CSSProps = ObservableProps<CSSAttributes>

  type HTMLStyleArrayProp = readonly (
    | FlatReadonlyRef<HTMLStyleProp>
    | HTMLStyleProp
  )[]

  type HTMLStyleProp =
    | HTMLStyleArrayProp
    | CSSProps
    | false
    | null
    | undefined extends infer HTMLStyleProp
    ? ReadonlyRef<HTMLStyleProp> | HTMLStyleProp
    : never

  type HTMLDatasetProp = Record<
    string,
    HTMLDatasetAttribute[string] | ReadonlyRef<HTMLDatasetAttribute[string]>
  > extends infer HTMLDatasetProp
    ? ReadonlyRef<HTMLDatasetProp> | HTMLDatasetProp
    : never

  type HTMLProps<T extends keyof HTMLAttributesByTagName> = unknown &
    HTMLObservableProps<T> &
    IntrinsicAttributes & {
      ref?: RefProp<Element> | RefProp<HTMLElement>
      children?: ChildrenProp
    }

  type SVGProps<T extends keyof SVGAttributesByTagName> = unknown &
    SVGObservableProps<T> &
    IntrinsicAttributes & {
      ref?: RefProp<Element> | RefProp<SVGElement>
      children?: ChildrenProp
    }

  type ObservableProps<Props extends object> = {
    [K in keyof Props]: ObservableProp<K, Props[K]>
  }

  /** One of the native HTML or SVG tags. */
  type TagName = HTMLTagName | SVGTagName

  /**
   * Infer the tag name of a DOM element.
   */
  type InferTagName<T extends AnyElement> = HTMLTagName extends any
    ? HTMLElementTagNameMap[HTMLTagName & keyof HTMLElementTagNameMap] extends T
      ? HTMLTagName
      : SVGTagName extends any
      ? SVGElementTagNameMap[SVGTagName & keyof SVGElementTagNameMap] extends T
        ? SVGTagName
        : never
      : never
    : never

  /**
   * Extract a DOM element type from a JSX element type.
   */
  type InferDOMElement<T> = T extends keyof HTMLElementTagNameMap
    ? HTMLElementTagNameMap[T]
    : T extends keyof SVGElementTagNameMap
    ? SVGElementTagNameMap[T]
    : T extends FunctionComponent
    ? JSX.Element
    : never

  /**
   * Infer DOM attributes from a DOM element or tag name.
   */
  type InferAttributes<T> = T extends HTMLTagName
    ? HTMLAttributesByTagName[T]
    : T extends SVGTagName
    ? SVGAttributesByTagName[T]
    : T extends AnyElement
    ? [HTMLElement] extends [T]
      ? HTMLAttributes<T>
      : [SVGElement] extends [T]
      ? SVGAttributes<T>
      : InferAttributes<InferTagName<T>>
    : never

  /**
   * Infer the JSX props from a JSX element type.
   */
  type InferProps<T> = T extends FunctionComponent<infer Props>
    ? Props
    : T extends HTMLTagName
    ? HTMLProps<T>
    : T extends SVGTagName
    ? SVGProps<T>
    : never

  /** @internal Required by TypeScript. It contains the prop types of every valid, host element. */
  type IntrinsicElements = { [T in HTMLTagName]: HTMLProps<T> } & {
    [T in SVGTagName]: SVGProps<T>
  }

  /** @internal Required by TypeScript. It contains attributes usable on any JSX element. */
  interface IntrinsicAttributes {
    key?: ElementKey | null | undefined
  }

  /**
   * @internal Required by TypeScript. It contains the type for JSX children.
   * @see https://www.typescriptlang.org/docs/handbook/jsx.html#children-type-checking
   */
  interface ElementChildrenAttribute {
    children: ChildrenProp
  }
}

//
// Internal types
//

type HTMLObservableProps<T extends HTMLTagName> =
  HTMLAttributesByTagName[T] extends infer Props
    ? { [K in keyof Props]: HTMLObservableProp<K, Props[K]> }
    : never

type HTMLObservableProp<
  Key extends keyof any,
  Value
> = Key extends `on${string}`
  ? Value
  : [HTMLClassAttribute | undefined] extends [Value]
  ? JSX.HTMLClassProp
  : [HTMLStyleAttribute | undefined] extends [Value]
  ? JSX.HTMLStyleProp
  : [HTMLDatasetAttribute | undefined] extends [Value]
  ? JSX.HTMLDatasetProp
  : [Value] extends [Record<string, any> | EventHandler | undefined]
  ? Value
  : Value | ReadonlyRef<Value>

type SVGObservableProps<T extends SVGTagName> =
  SVGAttributesByTagName[T] extends infer Props extends object
    ? T extends 'svg'
      ? { [K in keyof Props]: HTMLObservableProp<K, Props[K]> }
      : JSX.ObservableProps<Props>
    : never

type ObservableProp<Key extends keyof any, Value> =
  | Value
  | (Key extends 'children' | `on${string}`
      ? never
      : [Value] extends [Record<string, any> | EventHandler | undefined]
      ? never
      : ReadonlyRef<Value>)
