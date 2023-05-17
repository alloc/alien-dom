import type { AnyElement } from '../internal/types'
import { currentComponent } from '../internal/global'
import { updateFragment } from '../internal/updateFragment'
import { updateElement } from '../internal/updateElement'
import { isFragment, isElement } from '../internal/duck'

/**
 * Update the `node` (an element or fragment) to mirror the `newNode`.
 *
 * If you use this function, you should also wrap the `node` in a
 * `<ManualUpdates>` element if you add it to a JSX tree.
 */
export function updateNode(node: AnyElement, newNode: AnyElement) {
  const component = currentComponent.get()
  if (isFragment(node)) {
    updateFragment(node as any, newNode as any, component?.newRefs)
  } else if (isElement(node)) {
    updateElement(node, newNode, component?.newRefs)
  }
}
