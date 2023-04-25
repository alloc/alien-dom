import { AlienEffects } from '../effects'
import { kAlienNewEffects, kAlienEffects } from '../symbols'
import { AnyElement } from './types'

export function getAlienEffects<T extends AnyElement>(
  element: T
): AlienEffects<T> {
  const newEffects = kAlienNewEffects(element)
  return newEffects || kAlienEffects(element) || new AlienEffects(element)
}
