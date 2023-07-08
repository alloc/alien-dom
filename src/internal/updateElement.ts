import { AlienComponent, ElementRefs } from './component'
import { moveEffects } from './moveEffects'
import { recursiveMorph } from './recursiveMorph'
import { kAlienEffects } from './symbols'
import type { AnyElement } from './types'

export function updateElement(
  rootElement: AnyElement,
  newRootElement: AnyElement,
  arg3?: AlienComponent<any> | ElementRefs | null
) {
  const newRefs = arg3 instanceof Map ? arg3 : arg3?.newRefs
  const instance = arg3 instanceof AlienComponent ? arg3 : undefined
  const elementMap = new Map<AnyElement, AnyElement>()
  recursiveMorph(rootElement, newRootElement, newRefs, elementMap)
  if (instance) {
    moveEffects(instance.newEffects!, rootElement, elementMap, true)
  }
  for (const [newElement, oldElement] of elementMap) {
    const oldEffects = kAlienEffects(oldElement)
    const newEffects = kAlienEffects(newElement)
    if (newEffects) {
      moveEffects(newEffects, oldElement, elementMap)
    }
    oldEffects?.disable()
  }
}
