import type { AlienEffects } from '../effects'
import type { AnyElement } from './types'

/**
 * Retarget any new effect with a target that exists in the new->old
 * element map.
 */
export function moveEffects(
  newEffects: AlienEffects,
  elementMap: Map<AnyElement, AnyElement>,
  oldElement?: AnyElement
) {
  const { effects } = newEffects

  if (oldElement) {
    // The `setElement` call will run the effects if we don't unset them
    // here, which would be bad since we don't want to run them until
    // they've been retargeted.
    newEffects.effects = undefined
    newEffects.setElement(oldElement)
  }

  effects?.forEach(effect => {
    const oldElement = elementMap.get(effect.target)
    newEffects.run(effect as any, oldElement || effect.target)
  })
}
