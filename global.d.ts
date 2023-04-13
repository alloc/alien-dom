import { DefaultElement } from './dist/internal/types'
import {
  AlienElementList,
  AlienTag,
  AlienSelect,
  AlienElement,
} from './dist/element'
import {
  SpringAnimation,
  HTMLAnimatedProps,
  SVGAnimatedProps,
} from './dist/animate'

declare global {
  interface Element {
    readonly childNodes: AlienElementList<Element>
    cloneNode(deep?: boolean): this
    matches(selectors: string): boolean
    matches<Element extends AlienTag<DefaultElement>>(
      selectors: string
    ): this is AlienSelect<Element>
  }
  interface HTMLElement extends AlienElement<HTMLElement> {
    readonly childNodes: AlienElementList
    spring(
      animations:
        | SpringAnimation<this, HTMLAnimatedProps>
        | readonly SpringAnimation<this, HTMLAnimatedProps>[]
    ): this
  }
  interface SVGElement extends AlienElement<SVGElement> {
    readonly childNodes: AlienElementList<SVGElement>
    spring(
      animations:
        | SpringAnimation<this, SVGAnimatedProps>
        | readonly SpringAnimation<this, SVGAnimatedProps>[]
    ): this
  }
}

export {}
