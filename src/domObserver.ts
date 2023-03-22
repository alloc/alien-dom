import { $, $$ } from './selectors'
import { createHookType, getCurrentHook } from './hooks'

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

export const observeNewDescendants = createHookType(
  (target: Node, listener: (node: Element) => void) => {
    const { onAdded, dispose } = observe(target)
    onAdded.add(listener)
    return () => {
      onAdded.delete(listener)
      if (!onAdded.size) {
        dispose()
      }
    }
  }
)

export const observeRemovedDescendants = createHookType(
  (target: Node, listener: (node: Element) => void) => {
    const { onRemoved, dispose } = observe(target)
    onRemoved.add(listener)
    return () => {
      onRemoved.delete(listener)
      if (!onRemoved.size) {
        dispose()
      }
    }
  }
)

const observeElementHook = createHookType(
  (target: Node, key: 'onAdded' | 'onRemoved', effect: () => void) => {
    const self = getCurrentHook()
    if ((key == 'onAdded') == document.body.contains(target)) {
      self?.context?.remove(self)
      return effect()
    }
    const observer = observe(document.body)
    const listener = (node: Node) => {
      if (node.contains(target)) {
        self?.context?.remove(self)
        effect()
      }
    }
    observer[key].add(listener)
    return () => {
      if (
        observer[key].delete(listener) &&
        !(observer.onAdded.size + observer.onRemoved.size)
      ) {
        observer.dispose()
      }
    }
  }
)

/**
 * Runs the effect when the given target is mounted, then stops
 * observing the document.
 */
export const onMount = (target: Node, effect: () => void) =>
  observeElementHook(target, 'onAdded', effect)

/**
 * Runs the effect when the given target is unmounted, then stops
 * observing the document.
 */
export const onUnmount = (target: Node, effect: () => void) =>
  observeElementHook(target, 'onRemoved', effect)
