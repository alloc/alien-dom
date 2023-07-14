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
  if (component) {
    moveEffects(component.newEffects!, elementMap, rootElement)
  }
  for (const [newElement, oldElement] of elementMap) {
    const oldEffects = kAlienEffects(oldElement)
    const newEffects = kAlienEffects(newElement)
    if (newEffects) {
      moveEffects(newEffects, elementMap)
    }
    oldEffects?.disable()
  }
}
