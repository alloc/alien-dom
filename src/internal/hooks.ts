import { AlienHooks } from '../hooks'
import { kAlienNewHooks, kAlienHooks } from '../symbols'
import { AnyElement } from './types'

export function getAlienHooks<T extends AnyElement>(element: T): AlienHooks<T> {
  const newHooks = kAlienNewHooks(element)
  return newHooks || kAlienHooks(element) || new AlienHooks(element)
}
