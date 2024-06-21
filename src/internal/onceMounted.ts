import { isFunction } from '@alloc/is'
import { isElement, isFragment } from './duck'
import { getFragmentNodes } from './symbols'

type MountCallback = (node: any) => void

const pendingCallbacks = new WeakMap<Node, MountCallback | Set<MountCallback>>()

export function onceMounted<T extends Node>(
  node: T,
  callback: (node: T) => void
) {
  if (node.isConnected) {
    callback(node)
  } else {
    const callbacks = pendingCallbacks.get(node)
    if (callbacks) {
      if (isFunction(callbacks)) {
        pendingCallbacks.set(node, new Set([callbacks, callback]))
      } else {
        callbacks.add(callback)
      }
    } else {
      pendingCallbacks.set(node, callback)
    }
    return () => {
      const callbacks = pendingCallbacks.get(node)
      if (isFunction(callbacks)) {
        pendingCallbacks.delete(node)
      } else if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          pendingCallbacks.delete(node)
        }
      }
    }
  }
}

export function notifyMounted(node: Node) {
  if (node.isConnected) {
    notifyMountedRecursive(node)
  } else if (isFragment(node)) {
    const childNodes = getFragmentNodes(node)
    if (childNodes)
      for (const childNode of childNodes)
        if (childNode?.isConnected) {
          notifyMountedRecursive(childNode)
        }
  }
}

function notifyMountedRecursive(node: Node) {
  const callbacks = pendingCallbacks.get(node)
  if (callbacks) {
    pendingCallbacks.delete(node)

    if (isFunction(callbacks)) {
      try {
        callbacks(node)
      } catch (error) {
        console.error(error)
      }
    } else {
      for (const callback of callbacks) {
        try {
          callback(node)
        } catch (error) {
          console.error(error)
        }
      }
    }
  }
  if (isElement(node)) {
    for (let i = 0; i < node.childNodes.length; i++) {
      notifyMountedRecursive(node.childNodes[i])
    }
  }
}
