import { isElement } from '../functions/typeChecking'
import { AlienComponent } from '../internal/component'
import { currentComponent, currentNodeStore } from '../internal/global'
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
      const update = findNodeUpdate(key)
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

function findNodeUpdate(key: JSX.ElementKey) {
  let update: AnyDeferredNode | undefined
  let component: AlienComponent | null = lastValue(currentComponent)
  if (component) {
    // If a child node is a JSX element that was assigned to a variable in one
    // of our parent components, then that parent component will be the one
    // holding onto the child's deferred update. To be sure the child doesn't
    // have a deferred update, we'll have to search up the parent component
    // chain until we find a component that isn't currently rendering (i.e. its
    // `updates` property is null).
    do {
      if ((update = component.updates?.get(key))) break
    } while ((component = component.parent))
  } else {
    const nodeStore = lastValue(currentNodeStore)
    update = nodeStore?.getNodeUpdateForKey(key)
  }
  return update
}
