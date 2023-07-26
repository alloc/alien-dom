import { isFragment } from '../internal/duck'
import { DefaultElement } from '../internal/types'
import { DeferredNode } from '../jsx-dom/node'
import { morph } from '../morphdom/morph'
import { morphFragment } from '../morphdom/morphFragment'

/**
 * Update the `node` (an element or fragment) to mirror the `newNode`.
 *
 * If you use this function, you should also wrap the `node` in a
 * `<ManualUpdates>` element if you add it to a JSX tree.
 */
export function updateNode(
  node: DefaultElement | DocumentFragment,
  newNode: DeferredNode
) {
  if (isFragment(node)) {
    morphFragment(node, newNode)
  } else {
    morph(node, newNode)
  }
}
