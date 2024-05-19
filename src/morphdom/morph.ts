import { isRef } from '../core/observable'
import { addChildrenRef, applyRefProp } from '../internal/applyProp'
import { AlienComponent } from '../internal/component'
import { currentComponent } from '../internal/global'
import { getHostProps } from '../internal/symbols'
import type { HTMLOrSVGElement } from '../internal/types'
import { lastValue } from '../internal/util'
import {
  AnyDeferredNode,
  DeferredChildren,
  isDeferredHostNode,
} from '../jsx-dom/node'
import { morphAttributes } from './morphAttributes'
import { morphChildren } from './morphChildren'
import { morphComposite } from './morphComposite'

/**
 * This function assumes the two host nodes are compatible.
 */
export function morph(
  fromParentNode: HTMLOrSVGElement,
  toParentNode: AnyDeferredNode,
  component: AlienComponent | null = lastValue(currentComponent)
) {
  // Check for a deferred component update.
  if (!isDeferredHostNode(toParentNode)) {
    return morphComposite(fromParentNode, toParentNode)
  }

  const fromProps = getHostProps(fromParentNode)

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
