import type { AlienHooks } from '../hooks'
import type { ElementKey } from '../types/attr'

export type AnyElement = Element
export type DefaultElement = HTMLElement | SVGElement
export type AnyEvent = Event

export interface AlienComponent {
  hooks: AlienHooks
  memory: any[]
  memoryIndex: number
  /** The elements that were replaced by `refElement` */
  newElements: Map<ElementKey, DefaultElement>
  fromRef(key: ElementKey): DefaultElement | undefined
  setRef(key: ElementKey, element: DefaultElement): void
}
