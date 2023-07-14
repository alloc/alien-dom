import { AlienComponent, ElementRefs } from './component'
import { morph } from './morph'
import { moveEffects } from './moveEffects'
import { kAlienEffects } from './symbols'
import type { AnyElement } from './types'

export function updateElement(
  rootElement: AnyElement,
  newRootElement: AnyElement,
  arg3?: AlienComponent<any> | ElementRefs | null
) {
  const newRefs = arg3 instanceof Map ? arg3 : arg3?.newRefs
  const component = arg3 instanceof AlienComponent ? arg3 : undefined
  const elementMap = new Map<AnyElement, AnyElement>()

  morph(rootElement, newRootElement, elementMap, newRefs, component)

  // Retarget component effects from the current render pass, so that the
  // original version of each related node is passed into each effect. Avoid
  // calling `newEffects.setElement` since that would run the effects before the
  // render is complete.
  if (component?.newEffects) {
    moveEffects(
      rootElement,
      component.newEffects,
      elementMap,
      true /* skipSetElement */
    )
  }

  for (const [newElement, oldElement] of elementMap) {
    const oldEffects = kAlienEffects(oldElement)
    const newEffects = kAlienEffects(newElement)
    if (newEffects) {
      moveEffects(oldElement, newEffects, elementMap)
    }
    oldEffects?.setElement(null)
  }
}
