import { AlienComponent, ElementRefs } from './component'
import { morph } from './morph'
import type { DefaultElement } from './types'

export function updateElement(
  rootElement: DefaultElement,
  newRootElement: DefaultElement,
  arg3?: AlienComponent<any> | ElementRefs | null
) {
  const newRefs = arg3 instanceof Map ? arg3 : arg3?.newRefs
  const component = arg3 instanceof AlienComponent ? arg3 : undefined

  morph(rootElement, newRootElement, newRefs, component)
}
