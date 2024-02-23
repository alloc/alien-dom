import { hasForEach, isIterable } from '../internal/duck'
import { createAlienElementList } from '../internal/nodeList'
import { AnyElement, DefaultElement } from '../internal/types'
import type {
  AlienElement,
  AlienElementList,
  AlienSelect,
  AlienTag,
} from './element'

export function $<Element extends AlienTag<DefaultElement>>(
  element: AnyElement
): AlienSelect<Element>

export function $(element: AnyElement): AlienElement & AnyElement

export function $<Element extends AlienTag<DefaultElement>>(
  element: AnyElement | null
): AlienSelect<Element> | null

export function $(
  element: AnyElement | null
): (AlienElement & AnyElement) | null

export function $<Element extends AlienTag<DefaultElement> = DefaultElement>(
  selector: string
): AlienSelect<Element> | null

export function $(arg: any) {
  return typeof arg == 'string' ? document.querySelector(arg) : arg
}

export type AlienSelector =
  | string
  | AnyElement
  | readonly AnyElement[]
  | NodeListOf<AnyElement>
  | Iterable<AnyElement>

export const $$ = <Element extends AlienTag<DefaultElement> = DefaultElement>(
  ...selectors: (AlienSelector | false | null | undefined)[]
): AlienElementList<AlienSelect<Element>> => {
  if (selectors.length == 1) {
    if (typeof selectors[0] == 'string') {
      return document.querySelectorAll(selectors[0]) as any
    }
    return createAlienElementList<Element>(selectors[0])
  }
  const list: Node[] = createAlienElementList() as any
  for (const selector of selectors) {
    if (!selector) continue
    if (typeof selector == 'string') {
      document.querySelectorAll(selector).forEach(node => {
        list.push(node)
      })
    } else if (hasForEach(selector)) {
      selector.forEach(node => {
        list.push(node)
      })
    } else if (isIterable(selector)) {
      for (const node of selector) {
        list.push(node)
      }
    } else {
      list.push(selector)
    }
  }
  return list as any
}
