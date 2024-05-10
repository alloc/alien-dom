import { AnyElement } from '../../internal/types'

export type AlienTag =
  | AnyElement
  | keyof HTMLElementTagNameMap
  | keyof SVGElementTagNameMap

export type AlienSelect<T extends AlienTag> =
  T extends keyof HTMLElementTagNameMap
    ? HTMLElementTagNameMap[T]
    : T extends keyof SVGElementTagNameMap
    ? SVGElementTagNameMap[T]
    : T

/** Either a CSS selector or a function that returns a boolean */
export type AlienNodeFilter<Node> = string | ((node: Node) => boolean)
