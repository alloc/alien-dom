import { FunctionComponent } from './types/component'
import { kAlienSelfUpdating, kAlienFragment } from './symbols'
import { kFragmentNodeType } from './internal/constants'

export function getRenderFunc(
  component: FunctionComponent<any>
): Function | undefined {
  return (
    (component as any)[Symbol.for('alien:renderFunc')] ||
    kAlienSelfUpdating(component) ||
    component
  )
}

export function isConnected(element: Element) {
  return (
    element.nodeType === kFragmentNodeType
      ? (kAlienFragment(element) || element.childNodes)[0]
      : element
  ).isConnected
}
