import { notifyMounted } from '../internal/onceMounted'
import { unmount } from './unmount'

/**
 * Replace the children of the given `parent` node with the given `node`.
 *
 * ⚠️ You must use this in place of equivalent DOM methods, or else components
 * won't know when to run their side effects.
 */
export function mount(parent: ParentNode, node: Node) {
  while (parent.lastChild) {
    unmount(parent.lastChild)
  }
  mountLastChild(parent, node)
}

/**
 * Append the given `node` to the end of the given `parent` node.
 *
 * ⚠️ You must use this in place of equivalent DOM methods, or else components
 * won't know when to run their side effects.
 */
export function mountLastChild(parent: ParentNode, node: Node) {
  const wasConnected = node.isConnected
  parent.appendChild(node)
  if (!wasConnected) {
    notifyMounted(node)
  }
}

/**
 * Insert the given `node` at the beginning of the given `parent` node.
 *
 * ⚠️ You must use this in place of equivalent DOM methods, or else components
 * won't know when to run their side effects.
 */
export function mountFirstChild(parent: ParentNode, node: Node) {
  const wasConnected = node.isConnected
  parent.insertBefore(node, parent.firstChild)
  if (!wasConnected) {
    notifyMounted(node)
  }
}

/**
 * Insert the given `node` before the given `sibling` node.
 *
 * ⚠️ You must use this in place of equivalent DOM methods, or else components
 * won't know when to run their side effects.
 */
export function mountBeforeNode(sibling: ChildNode, node: Node) {
  const wasConnected = node.isConnected
  sibling.before(node)
  if (!wasConnected) {
    notifyMounted(node)
  }
}

/**
 * Insert the given `node` after the given `sibling` node.
 *
 * ⚠️ You must use this in place of equivalent DOM methods, or else components
 * won't know when to run their side effects.
 */
export function mountAfterNode(sibling: ChildNode, node: Node) {
  const wasConnected = node.isConnected
  sibling.after(node)
  if (!wasConnected) {
    notifyMounted(node)
  }
}

/**
 * Replace the given `oldNode` with the given `newNode`.
 *
 * ⚠️ You must use this in place of equivalent DOM methods, or else components won't know when to run their side effects.
 */
export function mountReplacementNode(oldNode: ChildNode, newNode: Node) {
  const wasConnected = newNode.isConnected
  oldNode.replaceWith(newNode)
  unmount(oldNode, true)
  if (!wasConnected) {
    notifyMounted(newNode)
  }
}
