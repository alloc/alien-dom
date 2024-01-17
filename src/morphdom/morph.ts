import { addChildrenRef, applyRefProp } from '../internal/applyProp'
import { AlienComponent } from '../internal/component'
import { kAlienHostProps } from '../internal/symbols'
import type { DefaultElement } from '../internal/types'
import {
  AnyDeferredNode,
  DeferredChildren,
  isDeferredHostNode,
} from '../jsx-dom/node'
import { isRef } from '../observable'
import { morphAttributes } from './morphAttributes'
import { morphChildren } from './morphChildren'
import { morphComposite } from './morphComposite'

/**
 * This function assumes the two host nodes are compatible.
 */
export function morph(
  fromParentNode: DefaultElement,
  toParentNode: AnyDeferredNode,
  component?: AlienComponent | null
) {
  // Check for a deferred component update.
  if (!isDeferredHostNode(toParentNode)) {
    return morphComposite(fromParentNode, toParentNode)
  }

  const fromProps = kAlienHostProps(fromParentNode)

  let toChildNodes: DeferredChildren
  if (isRef(toParentNode.children)) {
    toChildNodes = addChildrenRef(toParentNode.children, fromProps)
  } else {
    toChildNodes = toParentNode.children
  }

  morphAttributes(fromParentNode, toParentNode.props)
  morphChildren(fromParentNode, toChildNodes, component)

  if (toParentNode.ref) {
    applyRefProp(fromParentNode, toParentNode.ref, fromProps)
  }

  return fromParentNode
}
