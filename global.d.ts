import {
  AlienElementList,
  AlienTag,
  AlienSelect,
  AlienElement,
} from './dist/element'
import {
  AnimationsParam,
  HTMLAnimatedProps,
  SVGAnimatedProps,
} from './dist/animate'

declare global {
  interface Element {
    readonly childNodes: AlienElementList<Element>
    cloneNode(deep?: boolean): this
    matches(selectors: string): boolean
    matches<Element extends AlienTag>(
      selectors: string
    ): this is AlienSelect<Element>
  }
  interface HTMLElement extends AlienElement<HTMLElement> {
    readonly childNodes: AlienElementList
    spring(animations: AnimationsParam<this, HTMLAnimatedProps>): this
  }
  interface SVGElement extends AlienElement<SVGElement> {
    readonly childNodes: AlienElementList<SVGElement>
    spring(animations: AnimationsParam<this, SVGAnimatedProps>): this
  }
}

export {}
