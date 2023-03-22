import type { AlienHooks } from '../hooks'

export type AnyElement = Element
export type DefaultElement = HTMLElement | SVGElement
export type AnyEvent = Event

export type ElementKey = string | number

export interface AlienComponent {
  hooks: AlienHooks
  memory: any[]
  memoryIndex: number
  fromRef(key: ElementKey): AnyElement | undefined
  setRef(key: ElementKey, element: AnyElement): void
}
