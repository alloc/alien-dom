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
import { kAlienFragment, setSymbol } from './symbols'
import { ElementKey } from './types/attr'
import { AlienComponent } from './internal/component'
import { ElementTags } from './internal/component'

export function updateFragment(
  fragment: any,
  newFragment: any,
  newRefs?: Map<any, AnyElement>
) {
  const oldNodes: ChildNode[] = fragment[kAlienFragment]
  const oldKeys = oldNodes.map(getNodeKey)
  const newKeys = Array.from(newFragment.childNodes, getNodeKey)

  const elementMap = new Map<HTMLElement, HTMLElement>()

  let prevChild: ChildNode | undefined
  const newNodes = newKeys.map((newKey, newIndex) => {
    let oldNode: ChildNode | undefined
    if (newKey !== undefined) {
      const oldIndex = oldKeys.indexOf(newKey)
      if (oldIndex !== -1) {
        oldNode = oldNodes[oldIndex]
        recursiveMorph(
          oldNode as Element,
          newFragment.childNodes[newIndex],
          newRefs,
          elementMap,
          true /* isFragment */
        )
      }
    }
    const node = oldNode || newFragment.childNodes[newIndex]
    if (prevChild) {
      prevChild.after(node)
    } else {
      oldNodes[0].before(node)
    }
    prevChild = node
    return node
  })

  for (const oldNode of oldNodes) {
    if (!newNodes.includes(oldNode)) {
      oldNode.remove()
    }
  }

  setSymbol(fragment, kAlienFragment, newNodes)
  for (const [newElement, oldElement] of elementMap) {
    const oldHooks: AlienHooks = (oldElement as any)[kAlienHooks]
    const newHooks: AlienHooks = (newElement as any)[kAlienHooks]
    if (newHooks) retargetHooks(newHooks, oldElement, elementMap)
    oldHooks?.disable()
  }
}

export function updateElement(
  rootElement: AnyElement,
  newRootElement: AnyElement,
  instance?: AlienComponent<any>
) {
  const elementMap = new Map<HTMLElement, HTMLElement>()
  recursiveMorph(rootElement, newRootElement, instance?.newRefs, elementMap)
  if (instance) {
    retargetHooks(instance.newHooks!, rootElement, elementMap, true)
  }
  for (const [newElement, oldElement] of elementMap) {
    const oldHooks: AlienHooks = (oldElement as any)[kAlienHooks]
    const newHooks: AlienHooks = (newElement as any)[kAlienHooks]
    if (newHooks) retargetHooks(newHooks, oldElement, elementMap)
    oldHooks?.disable()
  }
}

/**
 * Retarget any new enablers whose target is found in the new->old
 * element map.
 */
function retargetHooks(
  newHooks: AlienHooks,
  oldElement: AnyElement,
  elementMap: Map<HTMLElement, HTMLElement>,
  isComponent?: boolean
) {
  const { enablers } = newHooks

  if (!isComponent) {
    // The `setElement` call will run the enablers if we don't unset
    // them here, which would be bad since we don't want to run them
    // until they've been retargeted.
    newHooks.enablers = undefined
    newHooks.setElement(oldElement)
  }

  enablers?.forEach(enabler => {
    const oldElement = elementMap.get(enabler.target)
    newHooks.enable(enabler as any, oldElement || enabler.target)
  })
}

function getNodeKey(node: any): ElementKey | undefined {
  return node[kAlienElementKey]
}

function recursiveMorph(
  oldParentElem: AnyElement,
  newParentElem: AnyElement,
  newRefs: Map<any, AnyElement> | null | undefined,
  elementMap: Map<HTMLElement, HTMLElement>,
  isFragment?: boolean,
  childrenOnly?: boolean
) {
  morph(oldParentElem, newParentElem, {
    getNodeKey,
    childrenOnly,
    onNodeDiscarded,
    onBeforeElUpdated(oldElem, newElem) {
      if (oldElem !== oldParentElem || isFragment) {
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
      recursiveMorph(oldElem, newElem, newRefs, elementMap, isFragment, true)
      return false
    },
  })
}

function onNodeDiscarded(node: Node) {
  // Prevent components from re-rendering and disable their hooks
  // when no parent element exists.
  if (node.hasOwnProperty(kAlienElementTags)) {
    const tags: ElementTags = (node as any)[kAlienElementTags]
    queueMicrotask(() => {
      for (const component of tags.values()) {
        component.disable()
      }
    })
  }
  node.childNodes.forEach(onNodeDiscarded)
}
