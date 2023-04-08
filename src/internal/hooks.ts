import { AlienHooks } from '../hooks'
import { kAlienNewHooks, kAlienHooks } from '../symbols'
import { AnyElement } from './types'

export function getAlienHooks<T extends AnyElement>(element: T): AlienHooks<T> {
  const newHooks = (element as any)[kAlienNewHooks]
  return newHooks || (element as any)[kAlienHooks] || new AlienHooks(element)
}
