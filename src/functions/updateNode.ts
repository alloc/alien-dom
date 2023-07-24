import { isElement, isFragment } from '../internal/duck'
import { currentComponent } from '../internal/global'
import type { AnyElement } from '../internal/types'
import { updateElement } from '../internal/updateElement'
import { updateFragment } from '../internal/updateFragment'
import { DeferredNode, isDeferredNode } from '../jsx-dom/node'

/**
 * Update the `node` (an element or fragment) to mirror the `newNode`.
 *
 * If you use this function, you should also wrap the `node` in a
 * `<ManualUpdates>` element if you add it to a JSX tree.
 */
export function updateNode(
  node: AnyElement,
  newNode: AnyElement | DeferredNode
) {
  if (!isDeferredNode(newNode)) {
    throw Error('not yet supported')
  }
  const component = currentComponent.get()
  if (isFragment(node)) {
    updateFragment(node as any, newNode, component?.newRefs)
  } else if (isElement(node)) {
    updateElement(node, newNode, component?.newRefs)
  }
}
