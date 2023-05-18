import type { AnyElement } from './types'
import type { AlienEffects } from '../effects'

/**
 * Retarget any new enablers whose target is found in the new->old
 * element map.
 */
export function moveEffects(
  newEffects: AlienEffects,
  oldElement: AnyElement,
  elementMap: Map<AnyElement, AnyElement>,
  isComponent?: boolean
) {
  const { effects } = newEffects

  if (!isComponent) {
    // The `setElement` call will run the enablers if we don't unset
    // them here, which would be bad since we don't want to run them
    // until they've been retargeted.
    newEffects.effects = undefined
    newEffects.setElement(oldElement)
  }

  effects?.forEach(enabler => {
    const oldElement = elementMap.get(enabler.target)
    newEffects.enable(enabler as any, oldElement || enabler.target)
  })
}
