import { UnrefElement } from './dist'
import {
  AnimationsParam,
  HTMLAnimatedProps,
  SVGAnimatedProps,
} from './dist/animate'
import {
  AlienElement,
  AlienElementList,
  AlienSelect,
  AlienTag,
} from './dist/element'
import * as t from './dist/types'

type AnyElement = Element

declare global {
  interface Element {
    readonly childNodes: AlienElementList<Element>
    cloneNode(deep?: boolean): UnrefElement<this>
    matches(selectors: string): boolean
    matches<Element extends AlienTag>(
      selectors: string
    ): this is AlienSelect<Element>
  }
  interface HTMLElement extends AlienElement<HTMLElement> {
    readonly childNodes: AlienElementList
    spring(
      animations: AnimationsParam<UnrefElement<this>, HTMLAnimatedProps>
    ): this
  }
  interface SVGElement extends AlienElement<SVGElement> {
    readonly childNodes: AlienElementList<SVGElement>
    spring(
      animations: AnimationsParam<UnrefElement<this>, SVGAnimatedProps>
    ): this
  }
  namespace JSX {
    type Element = t.JSX.Element
    type ElementKey = t.JSX.ElementKey
    type ElementRef<Element extends AnyElement = AnyElement> =
      t.JSX.ElementRef<Element>
    type RefProp<Element extends AnyElement = AnyElement> =
      t.JSX.RefProp<Element>
    type Child = t.JSX.Child
    type Children = t.JSX.Children
    type ChildrenProp = t.JSX.ChildrenProp
    type ElementOption = t.JSX.ElementOption
    type ElementProp = t.JSX.ElementProp
    type ElementsOption = t.JSX.ElementsOption
    type ElementsProp = t.JSX.ElementsProp
    type ElementType = t.JSX.ElementType
    type IntrinsicAttributes = t.JSX.IntrinsicAttributes
    type IntrinsicElements = t.JSX.IntrinsicElements
    type ElementAttributes<T> = t.JSX.ElementAttributes<T>
    type InstanceType<T extends string> = t.JSX.InstanceType<T>
  }
}

export {}
