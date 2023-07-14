import type { AlienEffects } from '../effects'
import { ShadowRootContext } from '../jsx-dom/appendChild'
import type { AnyElement } from './types'

/**
 * Associate the `newEffects` with the `oldElement`.
 *
 * Use the `elementMap` to retarget the new effects.
 */
export function moveEffects(
  oldElement: AnyElement,
  newEffects: AlienEffects,
  elementMap: Map<AnyElement, AnyElement>,
  skipSetElement?: boolean
) {
  const { effects } = newEffects

  // The `setElement` call will run the effects if we don't unset them here,
  // which would be bad since we don't want to run them until they've been
  // retargeted.
  newEffects.effects = undefined

  // In order for the new effects to be disabled when the time comes (i.e. when
  // a component is re-rendered), we have to associate them with an element that
  // is actually in the DOM.
  if (!skipSetElement) {
    newEffects.setElement(oldElement, ShadowRootContext.get())
  }

  effects?.forEach(effect => {
    const oldElement = elementMap.get(effect.target)
    newEffects.run(effect as any, oldElement || effect.target)
  })
}
