import type { AlienHooks } from '../hooks'
import type { ElementKey } from '../types/attr'

export type AnyElement = Element
export type DefaultElement = HTMLElement | SVGElement
export type AnyEvent = Event

export interface AlienComponent {
  hooks: AlienHooks
  memory: any[]
  memoryIndex: number
  fromRef(key: ElementKey): AnyElement | undefined
  setRef(key: ElementKey, element: AnyElement): void
}
