import { AlienElement, AlienElementList } from './addons/elementExtensions'
import { FromElementProxy } from './addons/elementProxy'
import { AlienElementPrototype } from './addons/global/element'
import { AlienNodeListPrototype } from './addons/global/nodeList'
import { AnimationsParam } from './core/animate'
import { AlienSelect, AlienTag } from './internal/types'
import {
  HTMLAttributesByTagName,
  SVGAttributesByTagName,
  JSX as jsx,
} from './types'

Object.setPrototypeOf(AlienElementPrototype, Node.prototype)
Object.setPrototypeOf(Element.prototype, AlienElementPrototype)
Object.assign(NodeList.prototype, AlienNodeListPrototype)

type AnyElement = Element

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
    spring(animations: AnimationsParam<HTMLElement>): this
  }
  interface SVGElement extends AlienElement<SVGElement> {
    readonly firstElementChild: SVGElement | null
    readonly lastElementChild: SVGElement | null
    readonly childNodes: AlienElementList<SVGElement>
    spring(animations: AnimationsParam<SVGElement>): this
  }
  namespace JSX {
    type Element = jsx.Element
    type ElementKey = jsx.ElementKey
    type ElementRef<Element extends AnyElement = AnyElement> =
      jsx.ElementRef<Element>
    type ElementLike = jsx.ElementLike
    type ElementProp = jsx.ElementProp
    type ElementsProp = jsx.ElementsProp
    type ElementType = jsx.ElementType

    type RefProp<Element extends AnyElement = AnyElement> = jsx.RefProp<Element>

    type Children = jsx.Children
    type ChildrenProp = jsx.ChildrenProp

    type HTMLClassArrayProp = jsx.HTMLClassArrayProp
    type HTMLClassMapProp = jsx.HTMLClassMapProp
    type HTMLClassProp = jsx.HTMLClassProp
    type HTMLStyleArrayProp = jsx.HTMLStyleArrayProp
    type HTMLStyleProp = jsx.HTMLStyleProp
    type HTMLDatasetProp = jsx.HTMLDatasetProp

    type CSSProps = jsx.CSSProps
    type HTMLProps<T extends keyof HTMLAttributesByTagName> = jsx.HTMLProps<T>
    type SVGProps<T extends keyof SVGAttributesByTagName> = jsx.SVGProps<T>
    type ObservableProps<Props extends object> = jsx.ObservableProps<Props>

    type TagName = jsx.TagName
    type InferTagName<T extends AnyElement> = jsx.InferTagName<T>

    type InferDOMElement<T> = jsx.InferDOMElement<T>
    type InferAttributes<T> = jsx.InferAttributes<T>
    type InferProps<T> = jsx.InferProps<T>

    type IntrinsicAttributes = jsx.IntrinsicAttributes
    type IntrinsicElements = jsx.IntrinsicElements
    type ElementChildrenAttribute = jsx.ElementChildrenAttribute
  }
}
