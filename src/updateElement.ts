import morph from 'morphdom'
import { AnyElement } from './internal/types'
import {
  kAlienElementTags,
  kAlienHooks,
  kAlienPlaceholder,
  kAlienElementKey,
} from './symbols'
import { AlienHooks } from './hooks'
import { copyAnimatedStyle } from './animate'

export function updateElement(
  rootElement: AnyElement,
  newRootElement: AnyElement,
  newRefs?: Map<any, AnyElement>
) {
  const elementMap = new Map<HTMLElement, HTMLElement>()
  recursiveMorph(rootElement, newRootElement, newRefs, elementMap)

  // By transferring hooks at the end, we can avoid unnecessary mount
  // listeners and ensure the DOM is up-to-date within each hook
  // callback.
  for (const [newElement, oldElement] of elementMap) {
    const oldHooks: AlienHooks = (oldElement as any)[kAlienHooks]
    const newHooks: AlienHooks = (newElement as any)[kAlienHooks]
    if (newHooks) {
      const { enablers } = newHooks
      newHooks.enablers = undefined
      newHooks.setElement(oldElement)
      enablers?.forEach(enabler => {
        const oldElement = elementMap.get(enabler.target)
        newHooks.enable(enabler as any, oldElement || enabler.target)
      })
    }
    oldHooks?.setElement(null)
  }
}

function getNodeKey(node: any) {
  return node[kAlienElementKey]
}

function recursiveMorph(
  oldParentElem: AnyElement,
  newParentElem: AnyElement,
  newRefs: Map<any, AnyElement> | undefined,
  elementMap: Map<HTMLElement, HTMLElement>,
  childrenOnly?: boolean
) {
  morph(oldParentElem, newParentElem, {
    getNodeKey,
    childrenOnly,
    onBeforeElUpdated(oldElem, newElem) {
      if (oldElem !== oldParentElem) {
        // Placeholders exist to prevent updates.
        if (newElem.hasOwnProperty(kAlienPlaceholder)) {
          return false
        }

        // If the element is self-updating, no update is needed unless
        // it was created in a loop or callback without a dynamic key.
        if (oldElem.hasOwnProperty(kAlienElementTags)) {
          const key = (newElem as any)[kAlienElementKey]
          if (newRefs && !newRefs.has(key)) {
            oldElem.replaceWith(newElem)
          }
          return false
        }
      }

      elementMap.set(newElem, oldElem)
      copyAnimatedStyle(oldElem, newElem)
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
      recursiveMorph(oldElem, newElem, newRefs, elementMap, true)
      return false
    },
  })
}
