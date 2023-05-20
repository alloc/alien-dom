import { isFragment } from './duck'
import { kAlienFragment } from './symbols'

export function isConnected(node: Node) {
  if (isFragment(node)) {
    const childNodes = kAlienFragment(node) || node.childNodes
    return childNodes[0].isConnected
  }
  return node.isConnected
}
