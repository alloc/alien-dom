import { defineEffectType, getCurrentEffect } from './effects'
import { binaryInsert } from './jsx-dom/util'
import { isElement } from './internal/duck'

type ElementListener = (element: Element) => void

type Observer = {
  rootNode: Node
  onAdded: Set<ElementListener>
  onRemoved: Set<ElementListener>
  dispose: () => void
}

const observersByRoot = new WeakMap<Node, Observer>()

function observe(rootNode: Node) {
  let result = observersByRoot.get(rootNode)
  if (!result) {
    const onAdded = new Set<ElementListener>()
    const onRemoved = new Set<ElementListener>()

    let queued = false
    const added = new Set<Element>()
    const removed = new Set<Element>()

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (isElement(node) && !removed.delete(node)) {
            added.add(node)
          }
        }
        for (const node of Array.from(mutation.removedNodes)) {
          if (isElement(node) && !added.delete(node)) {
            removed.add(node)
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
  return observeNewDescendants(target, node => {
    node.matches(selector) && effect(node as E)
    node.querySelectorAll(selector).forEach(effect as any)
  })
}

export function observeNewChildren(
  target: Node,
  listener: (node: Element) => void
) {
  return observeNewDescendants(target, node => {
    if (node.parentElement == target) {
      listener(node)
    }
  })
}

export function observeRemovedChildren(
  target: Node,
  listener: (node: Element) => void
) {
  return observeRemovedDescendants(target, node => {
    if (node.parentElement == target) {
      listener(node)
    }
  })
}

export const observeNewDescendants = /* @__PURE__ */ defineEffectType(
  (target: Node, listener: (node: Element) => void) => {
    const observer = observe(target)
    observer.onAdded.add(listener)
    return () => removeElementListener(observer, 'onAdded', listener)
  }
)

export const observeRemovedDescendants = /* @__PURE__ */ defineEffectType(
  (target: Node, listener: (node: Element) => void) => {
    const observer = observe(target)
    observer.onRemoved.add(listener)
    return () => removeElementListener(observer, 'onRemoved', listener)
  }
)

/**
 * Runs the effect when the given target is mounted, then stops
 * observing the document.
 */
export const onMount = (target: ChildNode, effect: () => void) =>
  createElementObserver(target, 'onAdded', effect)

/**
 * Runs the effect when the given target is unmounted, then stops
 * observing the document.
 */
export const onUnmount = (target: ChildNode, effect: () => void) =>
  createElementObserver(target, 'onRemoved', effect)

type DepthFirstEffect = [
  effect: () => void,
  depth: number,
  target: ChildNode,
  key: string
]

let depthFirstBatch: DepthFirstEffect[] | null = null

const createElementObserver = defineEffectType(
  (target: ChildNode, key: 'onAdded' | 'onRemoved', effect: () => void) => {
    const self = getCurrentEffect()
    if ((key == 'onAdded') == target.isConnected) {
      self?.context?.remove(self)
      return effect()
    }

    let depth = key == 'onRemoved' ? getElementDepth(target) : null

    function listener(element: Element) {
      if (element.contains(target)) {
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

    const observer = observe(target.ownerDocument!.body)
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
  observer: Observer,
  key: 'onAdded' | 'onRemoved',
  listener: ElementListener
) {
  if (
    observer[key].delete(listener) &&
    !(observer.onAdded.size + observer.onRemoved.size)
  ) {
    observersByRoot.delete(observer.rootNode)
    observer.dispose()
  }
}
