import { nodeFilter } from './nodeFilter'
import { AlienNodeFilter } from './types'

export function* parents<Node extends ParentNode>(node: ChildNode) {
  let parent = node.parentNode
  while (parent) {
    yield parent as Node
    parent = parent.parentNode
  }
}

export function firstParent<Node extends ParentNode>(
  node: ChildNode,
  filter: AlienNodeFilter<Node>
) {
  for (const parent of parents(node)) {
    if (nodeFilter(parent as any, filter)) {
      return parent
    }
  }
  return null
}
