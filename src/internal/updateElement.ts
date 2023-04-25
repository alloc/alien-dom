import type { AnyElement } from './types'
import { kAlienHooks } from '../symbols'
import { AlienComponent } from './component'
import { retargetHooks } from './retargetHooks'
import { recursiveMorph } from './recursiveMorph'

export function updateElement(
  rootElement: AnyElement,
  newRootElement: AnyElement,
  arg3?: AlienComponent<any> | Map<any, AnyElement> | null
) {
  const newRefs = arg3 instanceof Map ? arg3 : arg3?.newRefs
  const instance = arg3 instanceof AlienComponent ? arg3 : undefined
  const elementMap = new Map<AnyElement, AnyElement>()
  recursiveMorph(rootElement, newRootElement, newRefs, elementMap)
  if (instance) {
    retargetHooks(instance.newHooks!, rootElement, elementMap, true)
  }
  for (const [newElement, oldElement] of elementMap) {
    const oldHooks = kAlienHooks(oldElement)
    const newHooks = kAlienHooks(newElement)
    if (newHooks) {
      retargetHooks(newHooks, oldElement, elementMap)
    }
    oldHooks?.disable()
  }
}
