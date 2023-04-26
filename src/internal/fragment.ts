import { kAlienFragment } from '../symbols'

export function toChildNodes(parent: Element) {
  const oldNodes = kAlienFragment(parent)
  return oldNodes?.filter(filterMovedNodes) || Array.from(parent.childNodes)
}

// Filter out any child nodes that have since been moved to another
// parent element.
const filterMovedNodes = (node: ChildNode, index: number, nodes: ChildNode[]) =>
  node.isConnected && (index === 0 || node.parentNode === nodes[0].parentNode)
