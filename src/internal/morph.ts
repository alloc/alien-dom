import { morphAttributes } from '../morphdom/morphAttributes'
import { morphChildren } from '../morphdom/morphChildren'
import { morphInputElement } from '../morphdom/morphInput'
import { morphOptionElement } from '../morphdom/morphOption'
import { morphSelectElement } from '../morphdom/morphSelect'
import { morphTextAreaElement } from '../morphdom/morphTextArea'
import { AlienComponent, ElementRefs } from './component'
import { hasTagName, isElement } from './duck'
import {
  kAlienElementKey,
  kAlienElementTags,
  kAlienPlaceholder,
} from './symbols'
import type { AnyElement } from './types'

function shouldMorphElement(
  fromNode: AnyElement,
  toNode: AnyElement,
  refs: ElementRefs | null | undefined
) {
  // Placeholders exist to prevent updates. Some use cases include
  // cached elements and children of cached fragments.
  if (kAlienPlaceholder.in(toNode)) {
    return false
  }

  // If the element is self-updating, no update is needed unless
  // it was created in a loop or callback without a dynamic key.
  if (kAlienElementTags.in(fromNode)) {
    const key = kAlienElementKey(toNode)!
    if (refs && !refs.has(key)) {
      fromNode.replaceWith(toNode)
    }
    return false
  }

  return true
}

/**
 * This function assumes the two nodes are compatible.
 */
export function morph(
  fromParentNode: AnyElement,
  toParentNode: AnyElement,
  elementMap?: Map<AnyElement, AnyElement>,
  refs?: ElementRefs | null,
  component?: AlienComponent | null,
  isFragment?: boolean
): void {
  if (isFragment && !shouldMorphElement(fromParentNode, toParentNode, refs)) {
    return
  }

  elementMap?.set(toParentNode, fromParentNode)
  morphAttributes(fromParentNode, toParentNode)

  if (hasTagName(fromParentNode, 'TEXTAREA')) {
    return morphTextAreaElement(fromParentNode, toParentNode as any)
  }
  if (hasTagName(fromParentNode, 'INPUT')) {
    return morphInputElement(fromParentNode, toParentNode as any)
  }

  morphChildren(fromParentNode, toParentNode, {
    onBeforeNodeDiscarded: component ? discardKeyedNodesOnly : undefined,
    onNodeDiscarded,
    onNodePreserved(fromNode, toNode) {
      if (!isElement(fromNode)) {
        fromNode.nodeValue = toNode.nodeValue
      } else if (shouldMorphElement(fromNode, toNode as any, refs)) {
        morph(fromNode, toNode as any, elementMap, refs, component)
      }
    },
  })

  if (hasTagName(fromParentNode, 'SELECT')) {
    morphSelectElement(fromParentNode, toParentNode as any)
  } else if (hasTagName(fromParentNode, 'OPTION')) {
    morphOptionElement(fromParentNode, toParentNode as any)
  }
}

function discardKeyedNodesOnly(node: Node) {
  // Never remove a node that was added by an event listener or effect. Any nodes added by a
  // component render will have a position-based key defined automatically if they're missing an
  // explicit key, so this check is sufficient.
  return kAlienElementKey.in(node)
}

function onNodeDiscarded(node: Node) {
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
