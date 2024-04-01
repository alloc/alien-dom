import { isElement } from '../functions/typeChecking'
import { AlienComponent } from '../internal/component'
import { currentComponent } from '../internal/global'
import { kAlienElementKey } from '../internal/symbols'
import { compareNodeWithTag, lastValue } from '../internal/util'
import { morph } from '../morphdom/morph'
import {
  AnyDeferredNode,
  ShadowRootNode,
  evaluateDeferredNode,
  isDeferredNode,
} from './node'
import { ResolvedChild } from './resolveChildren'

/**
 * Either materialize a deferred node into a DOM node, update an existing DOM
 * node with a pending update, or do nothing and return a DOM node.
 */
export function evaluateChild<
  Child extends Exclude<ResolvedChild | DocumentFragment, ShadowRootNode | null>
>(child: Child): Exclude<Child, AnyDeferredNode>

export function evaluateChild(
  child: ChildNode | DocumentFragment | AnyDeferredNode
): ChildNode | DocumentFragment {
  if (isDeferredNode(child)) {
    child = evaluateDeferredNode(child)
  } else {
    const key = kAlienElementKey(child)
    if (key != null) {
      // Find a pending update for the child node, if any. Give up if we
      // find a parent component isn't being updated.
      let update: AnyDeferredNode | undefined
      let component: AlienComponent | null = lastValue(currentComponent)
      for (; component; component = component.parent) {
        if ((update = component.updates?.get(key))) break
      }
      if (update) {
        // It's possible that the child node was created in an earlier
        // render but never appended to the DOM (or it's being moved into a
        // newly created node). In that case, let's morph the existing node
        // instead of creating a new one.
        if (isElement(child) && compareNodeWithTag(child, update.tag)) {
          morph(child, update)
        } else {
          child = evaluateDeferredNode(update)
        }
      }
    }
  }
  return child
}
