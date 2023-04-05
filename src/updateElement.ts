import morph from 'morphdom'
import { AnyElement } from './internal/types'
import { kAlienElementTags, kAlienHooks, kAlienPlaceholder } from './symbols'
import { AlienHooks } from './hooks'
import { copyAnimatedStyle } from './animate'

export function updateElement(
  rootElement: AnyElement,
  newRootElement: AnyElement
) {
  const elementMap = new Map<HTMLElement, HTMLElement>()

  morph(rootElement, newRootElement, {
    // getNodeKey(node) {
    //   return (node as any)[kAlienElementKey]
    // },
    onBeforeElUpdated(oldElement, newElement) {
      const shouldUpdate =
        oldElement === rootElement ||
        !(
          oldElement.hasOwnProperty(kAlienElementTags) ||
          oldElement.hasOwnProperty(kAlienPlaceholder)
        )

      if (shouldUpdate) {
        elementMap.set(newElement, oldElement)
        copyAnimatedStyle(oldElement, newElement)
      }
      return shouldUpdate
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
