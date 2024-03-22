import {
  AnimationsParam,
  HTMLAnimatedProps,
  SVGAnimatedProps,
} from './addons/animate'
import {
  AlienElement,
  AlienElementList,
  AlienSelect,
  AlienTag,
} from './addons/element'
import { FromElementProxy } from './addons/elementProxy'
import { AlienElementPrototype } from './global/element'
import { AlienNodeListPrototype } from './global/nodeList'
import { JSX } from './types'

Object.setPrototypeOf(AlienElementPrototype, Node.prototype)
Object.setPrototypeOf(Element.prototype, AlienElementPrototype)
Object.assign(NodeList.prototype, AlienNodeListPrototype)

type AnyElement = Element
type JSXElement = JSX.Element
type JSXElementKey = JSX.ElementKey
type JSXElementRef<Element extends AnyElement = AnyElement> =
  JSX.ElementRef<Element>
type JSXRefProp<Element extends AnyElement = AnyElement> = JSX.RefProp<Element>
type JSXChild = JSX.Child
type JSXChildren = JSX.Children
type JSXChildrenProp = JSX.ChildrenProp
type JSXElementOption = JSX.ElementOption
type JSXElementProp = JSX.ElementProp
type JSXElementsOption = JSX.ElementsOption
type JSXElementsProp = JSX.ElementsProp
type JSXElementType = JSX.ElementType
type JSXIntrinsicAttributes = JSX.IntrinsicAttributes
type JSXIntrinsicElements = JSX.IntrinsicElements
type JSXElementAttributes<T> = JSX.ElementAttributes<T>
type JSXInstanceType<T extends string> = JSX.InstanceType<T>

declare global {
  interface Element {
    readonly childNodes: AlienElementList<Element>
    cloneNode(deep?: boolean): FromElementProxy<this>
    matches(selectors: string): boolean
    matches<Element extends AlienTag>(
      selectors: string
    ): this is AlienSelect<Element>
  }
  interface HTMLElement extends AlienElement<HTMLElement> {
    readonly firstElementChild: HTMLElement | SVGElement | null
    readonly lastElementChild: HTMLElement | SVGElement | null
    readonly childNodes: AlienElementList
    spring(
      animations: AnimationsParam<FromElementProxy<this>, HTMLAnimatedProps>
    ): this
  }
  interface SVGElement extends AlienElement<SVGElement> {
    readonly firstElementChild: SVGElement | null
    readonly lastElementChild: SVGElement | null
    readonly childNodes: AlienElementList<SVGElement>
    spring(
      animations: AnimationsParam<FromElementProxy<this>, SVGAnimatedProps>
    ): this
  }
  namespace JSX {
    type Element = JSXElement
    type ElementKey = JSXElementKey
    type ElementRef<Element extends AnyElement = AnyElement> =
      JSXElementRef<Element>
    type RefProp<Element extends AnyElement = AnyElement> = JSXRefProp<Element>
    type Child = JSXChild
    type Children = JSXChildren
    type ChildrenProp = JSXChildrenProp
    type ElementOption = JSXElementOption
    type ElementProp = JSXElementProp
    type ElementsOption = JSXElementsOption
    type ElementsProp = JSXElementsProp
    type ElementType = JSXElementType
    type IntrinsicAttributes = JSXIntrinsicAttributes
    type IntrinsicElements = JSXIntrinsicElements
    type ElementAttributes<T> = JSXElementAttributes<T>
    type InstanceType<T extends string> = JSXInstanceType<T>
  }
}
