/**
 * Replace this node with its children.
 */
export function unwrap<T extends Node = ChildNode>(node: Node) {
  const children: T[] = []
  const parent = node.parentNode
  if (parent) {
    while (node.firstChild) {
      children.push(node.firstChild as any)
      parent.insertBefore(node.firstChild, node)
    }
    parent.removeChild(node)
  }
  return children
}
