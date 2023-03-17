import { trackSubscription } from './context'
import { $, $$ } from './selectors'

type ElementListener = (element: Element) => void

type Observer = {
  onAdded: Set<ElementListener>
  onRemoved: Set<ElementListener>
  dispose: () => void
}

const observersByRoot = new WeakMap<Node, Observer>()

function observe(target: Node) {
  let result = observersByRoot.get(target)
  if (!result) {
    const onAdded = new Set<ElementListener>()
    const onRemoved = new Set<ElementListener>()

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof Element) {
            onAdded.forEach(listener => listener(node))
          }
        }
        for (const node of Array.from(mutation.removedNodes)) {
          if (node instanceof Element) {
            onRemoved.forEach(listener => listener(node))
          }
        }
      }
    })

    observer.observe(target, { childList: true, subtree: true })
    observersByRoot.set(
      target,
      (result = {
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
    $$($(node).filter(selector), $(node).$$(selector)).forEach(effect as any)
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

export function observeNewDescendants(
  target: Node,
  listener: (node: Element) => void
) {
  const { onAdded, dispose } = observe(target)
  onAdded.add(listener)
  return trackSubscription({
    target,
    dispose() {
      onAdded.delete(listener)
      if (!onAdded.size) {
        dispose()
      }
    },
  })
}

export function observeRemovedDescendants(
  target: Node,
  listener: (node: Element) => void
) {
  const { onRemoved, dispose } = observe(target)
  onRemoved.add(listener)
  return trackSubscription({
    target,
    dispose() {
      onRemoved.delete(listener)
      if (!onRemoved.size) {
        dispose()
      }
    },
  })
}

export function onMount(target: Node, effect: () => void) {
  const listener = observeNewDescendants(document.body, node => {
    if (node.contains(target)) {
      listener.dispose()
      effect()
    }
  })
  return listener
}

export function onUnmount(target: Node, effect: () => void) {
  const listener = observeRemovedDescendants(document.body, node => {
    if (node.contains(target)) {
      listener.dispose()
      effect()
    }
  })
  return listener
}
