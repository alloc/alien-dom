import { DeferredNode } from '../jsx-dom/node'
import { morph } from '../morphdom/morph'
import { AlienComponent, ElementRefs } from './component'
import type { DefaultElement } from './types'

export function updateElement(
  rootElement: DefaultElement,
  newRootElement: DeferredNode,
  arg3?: AlienComponent<any> | ElementRefs | null
) {
  const newRefs = arg3 instanceof Map ? arg3 : arg3?.newRefs
  const component = arg3 instanceof AlienComponent ? arg3 : undefined

  morph(rootElement, newRootElement, newRefs, component)
}
