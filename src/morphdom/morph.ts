import { addChildrenRef, applyRefProp } from '../internal/applyProp'
import { AlienComponent } from '../internal/component'
import { kAlienElementTags, kAlienHostProps } from '../internal/symbols'
import type { DefaultElement } from '../internal/types'
import {
  AnyDeferredNode,
  DeferredChildren,
  isDeferredHostNode,
} from '../jsx-dom/node'
import { isRef } from '../observable'
import { morphAttributes } from './morphAttributes'
import { morphChildren } from './morphChildren'

/**
 * This function assumes the two nodes are compatible.
 */
export function morph(
  fromParentNode: DefaultElement,
  toParentNode: AnyDeferredNode,
  component?: AlienComponent | null
): void {
  // Check for a deferred component update.
  if (isDeferredHostNode(toParentNode)) {
    const fromProps = kAlienHostProps(fromParentNode)

    let toChildNodes: DeferredChildren
    if (isRef(toParentNode.children)) {
      toChildNodes = addChildrenRef(toParentNode.children, fromProps)
    } else {
      toChildNodes = toParentNode.children
    }

    morphAttributes(fromParentNode, toParentNode.props)
    if (toChildNodes) {
      morphChildren(fromParentNode, toChildNodes, component)
    }

    if (toParentNode.ref) {
      applyRefProp(fromParentNode, toParentNode.ref, fromProps)
    }
  } else {
    const tags = kAlienElementTags(fromParentNode)!
    const childComponent = tags.get(toParentNode.tag)!

    childComponent.updateProps(toParentNode.props)
    toParentNode.context?.forEach((ref, key) => {
      const targetRef = childComponent.context.get(key)
      if (targetRef) {
        targetRef.value = ref.peek()
      }
    })
  }
}
