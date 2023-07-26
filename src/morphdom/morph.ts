import { isFunction } from '@alloc/is'
import { unmount } from '../functions/unmount'
import { AlienComponent } from '../internal/component'
import { kAlienElementTags } from '../internal/symbols'
import type { DefaultElement } from '../internal/types'
import { DeferredNode, evaluateDeferredNode } from '../jsx-dom/node'
import { ResolvedChild, resolveChildren } from '../jsx-dom/resolveChildren'
import { compareNodeNames } from '../jsx-dom/util'
import { isRef } from '../observable'
import { morphAttributes } from './morphAttributes'
import { morphChildren } from './morphChildren'

/**
 * This function assumes the two nodes are compatible.
 */
export function morph(
  fromParentNode: DefaultElement,
  toParentNode: DeferredNode,
  component?: AlienComponent | null
): void {
  // Check for a deferred component update.
  if (isFunction(toParentNode.tag)) {
    const tags = kAlienElementTags(fromParentNode)
    const childComponent = tags?.get(toParentNode.tag)
    if (childComponent) {
      childComponent.updateProps(toParentNode.props)
      toParentNode.context?.forEach((ref, key) => {
        const targetRef = childComponent.context.get(key)
        if (targetRef) {
          targetRef.value = ref.peek()
        }
      })
    } else {
      // The component was not found, so replace the old node.
      const node = evaluateDeferredNode(toParentNode)
      fromParentNode.replaceWith(node)
      unmount(fromParentNode, true)
    }
    return
  }

  // If this happens, there is an internal bug.
  if (!compareNodeNames(fromParentNode.nodeName, toParentNode.tag)) {
    throw Error('morph expects compatible host nodes')
  }

  morphAttributes(fromParentNode, toParentNode)

  let toChildNodes: HTMLCollection | ResolvedChild[]
  if (isRef(toParentNode.children)) {
    const children = toParentNode.children.peek()
    toChildNodes = resolveChildren(children)
  } else {
    toChildNodes = toParentNode.children!
  }

  morphChildren(fromParentNode, toChildNodes, component)
}
