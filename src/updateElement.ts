import { morph } from './morphdom'
import { AnyElement } from './internal/types'
import {
  kAlienElementTags,
  kAlienHooks,
  kAlienPlaceholder,
  kAlienElementKey,
} from './symbols'
import { AlienHooks } from './hooks'
import { copyAnimatedStyle } from './animate'
import { kAlienFragment, kAlienManualUpdates } from './symbols'
import { AlienComponent } from './internal/component'
import { currentComponent } from './global'
import { kFragmentNodeType, kElementNodeType } from './internal/constants'

/**
 * Update the `node` (an element or fragment) to mirror the `newNode`.
 *
 * If you use this function, you should also wrap the `node` in a
 * `<ManualUpdates>` element if you add it to a JSX tree.
 */
export function updateNode(node: AnyElement, newNode: AnyElement) {
  const component = currentComponent.get()
  if (node.nodeType === kFragmentNodeType) {
    updateFragment(node as any, newNode as any, component?.newRefs)
  } else if (node.nodeType === kElementNodeType) {
    updateElement(node, newNode, component?.newRefs)
  }
}

/** @internal */
export function updateFragment(
  fragment: DocumentFragment,
  newFragment: DocumentFragment,
  newRefs?: Map<any, AnyElement> | null
) {
  const oldNodes = kAlienFragment(fragment)!
  const oldKeys = oldNodes.map(kAlienElementKey.get)
  const newNodes: ChildNode[] = Array.from<any>(newFragment.childNodes)
  const newKeys = newNodes.map(kAlienElementKey.get)

  const elementMap = new Map<AnyElement, AnyElement>()
  const isManualUpdate = kAlienManualUpdates.in(newFragment)

  let prevChild: ChildNode | undefined
  newKeys.forEach((newKey, newIndex) => {
    let oldNode: ChildNode | undefined
    // When the root fragment is a <ManualUpdates> element, skip reuse
    // of old nodes and prefer the latest nodes instead.
    if (!isManualUpdate && newKey !== undefined) {
      const oldIndex = oldKeys.indexOf(newKey)
      if (oldIndex !== -1) {
        oldNode = oldNodes[oldIndex]
        recursiveMorph(
          oldNode as Element,
          newNodes[newIndex] as Element,
          newRefs,
          elementMap,
          true /* isFragment */
        )
      }
    }
    if (prevChild) {
      const node = oldNode || newNodes[newIndex]
      prevChild.after(node)
      prevChild = node
    } else {
      // The first node is always the placeholder comment node where the
      // component hooks are attached.
      prevChild = oldNode = oldNodes[0]
    }
    if (oldNode) {
      newNodes[newIndex] = oldNode
    }
  })

  for (const oldNode of oldNodes) {
    if (!newNodes.includes(oldNode)) {
      oldNode.remove()
    }
  }

  kAlienFragment(fragment, newNodes)

  for (const [newElement, oldElement] of elementMap) {
    const oldHooks = kAlienHooks(oldElement)
    const newHooks = kAlienHooks(newElement)
    if (newHooks) {
      retargetHooks(newHooks, oldElement, elementMap)
    }
    oldHooks?.disable()
  }
}

/** @internal */
export function updateElement(
  rootElement: AnyElement,
  newRootElement: AnyElement,
  arg3?: AlienComponent<any> | Map<any, AnyElement> | null
) {
  const newRefs = arg3 instanceof Map ? arg3 : arg3?.newRefs
  const instance = arg3 instanceof AlienComponent ? arg3 : undefined
  const elementMap = new Map<AnyElement, AnyElement>()
  recursiveMorph(rootElement, newRootElement, newRefs, elementMap)
  if (instance) {
    retargetHooks(instance.newHooks!, rootElement, elementMap, true)
  }
  for (const [newElement, oldElement] of elementMap) {
    const oldHooks = kAlienHooks(oldElement)
    const newHooks = kAlienHooks(newElement)
    if (newHooks) {
      retargetHooks(newHooks, oldElement, elementMap)
    }
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
  elementMap: Map<AnyElement, AnyElement>,
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

function recursiveMorph(
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

function onNodeDiscarded(node: Node) {
  // Prevent components from re-rendering and disable their hooks
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
