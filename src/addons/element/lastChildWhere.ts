export function lastChildWhere<T extends ChildNode = ChildNode>(
  parentNode: ParentNode,
  filter: (child: T) => boolean
): T | null {
  for (let child = parentNode.lastChild; child; child = child.previousSibling) {
    if (filter(child as T)) {
      return child as T
    }
  }
  return null
}
