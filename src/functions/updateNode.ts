import type { AnyElement } from '../internal/types'
import { currentComponent } from '../internal/global'
import { kFragmentNodeType, kElementNodeType } from '../internal/constants'
import { updateFragment } from '../internal/updateFragment'
import { updateElement } from '../internal/updateElement'

/**
 * Update the `node` (an element or fragment) to mirror the `newNode`.
 *
 * If you use this function, you should also wrap the `node` in a
 * `<ManualUpdates>` element if you add it to a JSX tree.
 */
export function updateNode(node: AnyElement, newNode: AnyElement) {
  const component = currentComponent.get()
  if (node.nodeType === kFragmentNodeType) {
    updateFragment(node as any, newNode as any, component?.newRefs)
  } else if (node.nodeType === kElementNodeType) {
    updateElement(node, newNode, component?.newRefs)
  }
}
