import {
  AlienElementList,
  AlienTag,
  AlienSelect,
  AlienElement,
} from './dist/element'
import { DefaultElement } from './dist/internal/types'

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
  }
  interface SVGElement extends AlienElement<SVGElement> {
    readonly childNodes: AlienElementList<SVGElement>
  }
}

export {}
