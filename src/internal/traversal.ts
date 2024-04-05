import { isElement } from './duck'
import { AnyElement } from './types'

export function findFirstElement(
  node: ChildNode | null,
  end?: ChildNode | null
): AnyElement | null {
  while (node && !isElement(node)) {
    if (node === end) {
      return null
    }
    node = node.nextSibling
  }
  return node
}

export function findLastElement(
  node: ChildNode | null,
  start?: ChildNode | null
): AnyElement | null {
  while (node && !isElement(node)) {
    if (node === start) {
      return null
    }
    node = node.previousSibling
  }
  return node
}
