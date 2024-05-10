import { nodeFilter } from './nodeFilter'
import { AlienNodeFilter } from './types'

export function removeChildren(
  context: ParentNode,
  selector?: AlienNodeFilter<ChildNode>
) {
  for (
    let child = context.firstChild, nextSibling: ChildNode | null;
    child !== null;
    child = nextSibling
  ) {
    nextSibling = child.nextSibling
    if (!selector || nodeFilter(child, selector)) {
      context.removeChild(child)
    }
  }
}
