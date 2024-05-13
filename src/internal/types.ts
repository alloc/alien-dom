import type { FromElementProxy } from '../addons/elementProxy'

export type AnyElement = Element
export type AnyEvent = Event

export type HTMLOrSVGElement = HTMLElement | SVGElement
export type {
  /** @deprecated Use HTMLOrSVGElement */
  HTMLOrSVGElement as DefaultElement,
}

/**
 * Allows type casting via tag name (eg: `"a"` → `HTMLAnchorElement`)
 */
export type AlienTag<Element extends AnyElement = HTMLOrSVGElement> =
  | Element
  | (Element extends HTMLElement
      ? HTMLElement | keyof HTMLElementTagNameMap
      : never)
  | SVGElement
  | keyof SVGElementTagNameMap

type LooseAccess<T, K> = K extends keyof T ? T[K] : never

type AlienTagNameMap<Element extends AnyElement> = Element extends any
  ?
      | SVGElementTagNameMap
      | ([AnyElement] extends [Element]
          ? HTMLElementTagNameMap
          : Element extends HTMLElement
          ? HTMLElementTagNameMap
          : never)
  : never

/**
 * Coerce an `AlienTag<Element>` to an `Element`.
 */
export type AlienSelect<
  T extends string | AnyElement,
  Context extends AnyElement = AnyElement
> = T extends string
  ? AlienTagNameMap<FromElementProxy<Context>> extends infer TagNameMap
    ? TagNameMap extends any
      ? Extract<LooseAccess<TagNameMap, T>, Node>
      : never
    : never
  : T
