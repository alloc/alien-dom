import { AlienEffectContext } from '../effects'
import { kAlienNewEffects, kAlienEffects } from '../symbols'
import { AnyElement } from './types'

export function getAlienEffects<T extends AnyElement>(
  element: T
): AlienEffectContext<T> {
  const newEffects = kAlienNewEffects(element)
  return newEffects || kAlienEffects(element) || new AlienEffectContext(element)
}
