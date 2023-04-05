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

  morph(rootElement, newRootElement, {
    // getNodeKey(node) {
    //   return (node as any)[kAlienElementKey]
    // },
    onBeforeElUpdated(oldElement, newElement) {
      if (oldElement !== rootElement) {
        // Placeholders exist to prevent updates.
        if (newElement.hasOwnProperty(kAlienPlaceholder)) {
          return false
        }
        // If the element is self-updating, no update is needed unless
        // it was created in a loop or callback without a dynamic key.
        else if (oldElement.hasOwnProperty(kAlienElementTags)) {
          const key = (newElement as any)[kAlienElementKey]
          if (newRefs && !newRefs.has(key)) {
            oldElement.replaceWith(newElement)
          }
          return false
        }
      }

      elementMap.set(newElement, oldElement)
      copyAnimatedStyle(oldElement, newElement)
      return true
    },
  })

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
