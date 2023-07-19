import { morphAttributes } from '../morphdom/morphAttributes'
import { morphChildren } from '../morphdom/morphChildren'
import { morphInputElement } from '../morphdom/morphInput'
import { morphOptionElement } from '../morphdom/morphOption'
import { morphSelectElement } from '../morphdom/morphSelect'
import { morphTextAreaElement } from '../morphdom/morphTextArea'
import { applyInitialPropsRecursively } from './applyProp'
import { AlienComponent, ElementRefs } from './component'
import { hasTagName, isElement } from './duck'
import {
  kAlienElementKey,
  kAlienElementTags,
  kAlienPlaceholder,
} from './symbols'
import type { DefaultElement } from './types'

export function shouldMorphElement(
  fromNode: DefaultElement,
  toNode: DefaultElement,
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
  fromParentNode: DefaultElement,
  toParentNode: DefaultElement,
  refs?: ElementRefs | null,
  component?: AlienComponent | null
): void {
  morphAttributes(fromParentNode, toParentNode)

  if (hasTagName(fromParentNode, 'TEXTAREA')) {
    return morphTextAreaElement(fromParentNode, toParentNode as any)
  }
  if (hasTagName(fromParentNode, 'INPUT')) {
    return morphInputElement(fromParentNode, toParentNode as any)
  }

  morphChildren(fromParentNode, toParentNode, {
    onBeforeNodeDiscarded: component ? discardKeyedNodesOnly : undefined,
    onNodeAdded(node) {
      if (isElement(node)) {
        applyInitialPropsRecursively(node)
      }
    },
    onNodePreserved(fromNode, toNode) {
      if (!isElement(fromNode)) {
        fromNode.nodeValue = toNode.nodeValue
      } else if (shouldMorphElement(fromNode, toNode as any, refs)) {
        morph(fromNode, toNode as any, refs, component)
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
  // Never remove a node that was added by an event listener or effect. Any
  // nodes added by a component render will have a position-based key defined
  // automatically if they're missing an explicit key, so this check is
  // sufficient.
  return kAlienElementKey.in(node)
}
