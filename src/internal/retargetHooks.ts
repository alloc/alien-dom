import type { AnyElement } from '../internal/types'
import type { AlienHooks } from '../hooks'

/**
 * Retarget any new enablers whose target is found in the new->old
 * element map.
 */
export function retargetHooks(
  newHooks: AlienHooks,
  oldElement: AnyElement,
  elementMap: Map<AnyElement, AnyElement>,
  isComponent?: boolean
) {
  const { enablers } = newHooks

  if (!isComponent) {
    // The `setElement` call will run the enablers if we don't unset
    // them here, which would be bad since we don't want to run them
    // until they've been retargeted.
    newHooks.enablers = undefined
    newHooks.setElement(oldElement)
  }

  enablers?.forEach(enabler => {
    const oldElement = elementMap.get(enabler.target)
    newHooks.enable(enabler as any, oldElement || enabler.target)
  })
}
