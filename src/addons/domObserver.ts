import { defineEffectType, getCurrentEffect } from '../core/effects'
import { binaryInsert } from '../internal/binaryInsert'
import { isComment, isElement } from '../internal/duck'
import { DefaultElement } from '../internal/types'

type ObservableNode = DefaultElement | Comment
type NodeCallback = (node: ObservableNode) => void

type RootNodeObserver = {
  rootNode: Node
  onAdded: Set<NodeCallback>
  onRemoved: Set<NodeCallback>
  dispose: () => void
}

const observersByRoot = new WeakMap<Node, RootNodeObserver>()

function observe(rootNode: Node) {
  let result = observersByRoot.get(rootNode)
  if (!result) {
    const onAdded = new Set<NodeCallback>()
    const onRemoved = new Set<NodeCallback>()

    let queued = false
    const added = new Set<ObservableNode>()
    const removed = new Set<ObservableNode>()

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (isElement(node) || isComment(node)) {
            removed.delete(node) || added.add(node)
          }
        }
        for (const node of Array.from(mutation.removedNodes)) {
          if (isElement(node) || isComment(node)) {
            added.delete(node) || removed.add(node)
          }
        }
      }
      if (!queued) {
        queued = true
        queueMicrotask(() => {
          queued = false

          if (!added.size && !removed.size) {
            return
          }

          const lastAdded = [...added]
          const lastRemoved = [...removed]

          added.clear()
          removed.clear()

          lastAdded.forEach(node => {
            onAdded.forEach(listener => listener(node))
          })
          lastRemoved.forEach(node => {
            onRemoved.forEach(listener => listener(node))
          })
        })
      }
    })

    observer.observe(rootNode, { childList: true, subtree: true })
    observersByRoot.set(
      rootNode,
      (result = {
        rootNode,
        onAdded,
        onRemoved,
        dispose() {
          observer.disconnect()
        },
      })
    )
  }
  return result
}

export function matchDescendants<E extends Element>(
  target: Node,
  selector: string,
  effect: (node: E) => void
) {
  return observeNewDescendants(target, parentNode => {
    if (isElement(parentNode)) {
      parentNode.matches(selector) && effect(parentNode as any)
      parentNode.querySelectorAll(selector).forEach(effect as any)
    }
  })
}

export function observeNewChildren(
  target: Node,
  listener: (childNode: ObservableNode) => void
) {
  return observeNewDescendants(target, childNode => {
    if (childNode.parentElement == target) {
      listener(childNode)
    }
  })
}

export function observeRemovedChildren(
  target: Node,
  listener: (childNode: ObservableNode) => void
) {
  return observeRemovedDescendants(target, childNode => {
    if (childNode.parentElement == target) {
      listener(childNode)
    }
  })
}

export const observeNewDescendants = /* @__PURE__ */ defineEffectType(
  (target: Node, callback: NodeCallback) => {
    const observer = observe(target)
    observer.onAdded.add(callback)
    return () => removeElementListener(observer, 'onAdded', callback)
  }
)

export const observeRemovedDescendants = /* @__PURE__ */ defineEffectType(
  (target: Node, callback: NodeCallback) => {
    const observer = observe(target)
    observer.onRemoved.add(callback)
    return () => removeElementListener(observer, 'onRemoved', callback)
  }
)

/**
 * Runs the effect when the given target is mounted, then stops
 * observing the document.
 */
export const onMount = (
  target: ChildNode,
  effect: () => void,
  rootNode: Node = document as any
) => createElementObserver(target, 'onAdded', effect, rootNode)

/**
 * Runs the effect when the given target is unmounted, then stops
 * observing the document.
 */
export const onUnmount = (
  target: ChildNode,
  effect: () => void,
  rootNode = target.getRootNode()
) => createElementObserver(target, 'onRemoved', effect, rootNode)

type DepthFirstEffect = [
  effect: () => void,
  depth: number,
  target: ChildNode,
  key: string
]

let depthFirstBatch: DepthFirstEffect[] | null = null

const createElementObserver = defineEffectType(
  (
    target: ChildNode,
    key: 'onAdded' | 'onRemoved',
    effect: () => void,
    rootNode: Node
  ) => {
    const self = getCurrentEffect()
    if ((key == 'onAdded') == target.isConnected) {
      self?.context?.remove(self)
      return effect()
    }

    let depth = key == 'onRemoved' ? getElementDepth(target) : null

    function listener(parentNode: ObservableNode) {
      // The strict equals check if required for comment nodes.
      if (parentNode === target || parentNode.contains(target)) {
        if (self?.context) {
          self.context.remove(self)
        } else {
          dispose()
        }
        const batch = (depthFirstBatch ||= [] as DepthFirstEffect[])
        if (!batch.length) {
          queueMicrotask(() => {
            depthFirstBatch = null
            batch.forEach(([effect]) => effect())
          })
        }
        depth ??= getElementDepth(target)
        binaryInsert<DepthFirstEffect>(
          batch,
          [effect, depth, target, key],
          ([, a], [, b]) => b - a
        )
      }
    }

    const observer = observe(rootNode)
    observer[key].add(listener)

    function dispose() {
      removeElementListener(observer, key, listener)
    }

    return dispose
  }
)

function getElementDepth(elem: ChildNode, stopAt?: Element) {
  let depth = 0
  while (elem.parentElement && elem.parentElement != stopAt) {
    depth++
    elem = elem.parentElement
  }
  return depth
}

function removeElementListener(
  observer: RootNodeObserver,
  key: 'onAdded' | 'onRemoved',
  listener: NodeCallback
) {
  if (
    observer[key].delete(listener) &&
    !(observer.onAdded.size + observer.onRemoved.size)
  ) {
    observersByRoot.delete(observer.rootNode)
    observer.dispose()
  }
}
