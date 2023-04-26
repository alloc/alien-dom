import type { AnyElement } from './types'
import {
  kAlienElementTags,
  kAlienElementKey,
  kAlienPlaceholder,
} from './symbols'
import { morph } from '../morphdom'
import { copyAnimatedStyle } from './animate'

export function recursiveMorph(
  oldParentElem: AnyElement,
  newParentElem: AnyElement,
  newRefs: Map<any, AnyElement> | null | undefined,
  elementMap: Map<AnyElement, AnyElement>,
  isFragment?: boolean,
  childrenOnly?: boolean
) {
  morph(oldParentElem as any, newParentElem as any, {
    getNodeKey: kAlienElementKey.get,
    childrenOnly,
    onNodeDiscarded,
    onBeforeElUpdated(oldElem, newElem) {
      if (oldElem !== oldParentElem || isFragment) {
        // Placeholders exist to prevent updates. Some use cases include
        // cached elements and children of cached fragments.
        if (kAlienPlaceholder.in(newElem)) {
          return false
        }

        // If the element is self-updating, no update is needed unless
        // it was created in a loop or callback without a dynamic key.
        if (kAlienElementTags.in(oldElem)) {
          const key = kAlienElementKey(newElem)
          if (newRefs && !newRefs.has(key)) {
            oldElem.replaceWith(newElem)
          }
          return false
        }
      }

      elementMap.set(newElem, oldElem)
      copyAnimatedStyle(oldElem as any, newElem as any)
      return true
    },
    onBeforeElChildrenUpdated(oldElem, newElem) {
      if (oldElem === oldParentElem) {
        return true
      }
      // Textarea elements need special handling (provided by morphdom)
      // and they're guaranteed to not have children.
      if (oldElem.nodeName === 'TEXTAREA') {
        return true
      }
      // Each parent element gets its own `morph` call, so that element
      // keys are local to the parent and not the entire subtree.
      recursiveMorph(oldElem, newElem, newRefs, elementMap, isFragment, true)
      return false
    },
  })
}

export function onNodeDiscarded(node: Node) {
  // Prevent components from re-rendering and disable their effects
  // when no parent element exists.
  if (kAlienElementTags.in(node)) {
    const tags = kAlienElementTags(node)!
    queueMicrotask(() => {
      for (const component of tags.values()) {
        component.disable()
      }
    })
  }
  node.childNodes.forEach(onNodeDiscarded)
}
