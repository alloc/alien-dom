import { isFunction, isString } from '@alloc/is'
import { Fragment } from '../components/Fragment'
import { ContextStore } from '../context'
import { AlienComponent, AlienRunningComponent } from '../internal/component'
import { forwardContext, getContext } from '../internal/context'
import { isComment, isElement, isFragment, isNode } from '../internal/duck'
import {
  prependFragmentHeader,
  updateParentFragment,
  wrapWithFragment,
} from '../internal/fragment'
import { fromElementThunk } from '../internal/fromElementThunk'
import {
  currentComponent,
  currentEffects,
  currentMode,
} from '../internal/global'
import {
  kAlienElementKey,
  kAlienElementTags,
  kAlienFragmentNodes,
  kAlienParentFragment,
  kAlienRenderFunc,
  kAlienSelfUpdating,
} from '../internal/symbols'
import type { AnyElement } from '../internal/types'
import {
  evaluateDeferredNode,
  isDeferredNode,
  isShadowRoot,
} from '../jsx-dom/node'
import { ShadowRootContext } from '../jsx-dom/shadow'
import { compareNodeNames, noop } from '../jsx-dom/util'
import { morph } from '../morphdom/morph'
import { morphFragment } from '../morphdom/morphFragment'
import { ref } from '../observable'
import type { JSX } from '../types/jsx'
import { attachRef } from './attachRef'
import { unmount } from './unmount'

/**
 * Create a self-updating component whose render function can mutate its
 * props to re-render itself. The original element is morphed into the
 * new element (using `morphdom`).
 *
 * The given `render` function must be pure (no side effects), but its
 * event listeners can have side effects. Another exception is that any
 * object created within the render function can be mutated freely.
 */
export function selfUpdating<
  Props extends object,
  Result extends JSX.ChildrenProp
>(render: (props: Readonly<Props>) => Result): (props: Props) => Result {
  const componentName = DEV
    ? () =>
        (kAlienRenderFunc(render) || kAlienRenderFunc(Component) || render)
          .name || (Component as any).displayName
    : noop

  const Component = (initialProps: Props): any => {
    const props = {} as Props
    const context = new ContextStore(getContext())

    for (const key in initialProps) {
      const initialValue = initialProps[key]
      attachRef(props, key, ref(initialValue))
    }

    let oldPropChanged = false
    let newPropAdded = false

    const updateProps = (newProps: Partial<Props>) => {
      for (const key in newProps) {
        const newValue = newProps[key]
        if (props.hasOwnProperty(key)) {
          const oldValue = props[key]
          props[key] = newValue as any
          if (newValue !== oldValue) {
            oldPropChanged = true
          }
        } else {
          attachRef(props, key, ref(newValue))
          newPropAdded = true
        }
      }
      if (oldPropChanged || newPropAdded) {
        self.update()
      }
    }

    const self = new AlienComponent(
      currentComponent.get(),
      Component as any,
      props,
      context,
      updateProps,
      componentName
    ) as AlienRunningComponent

    let updateScheduled = false

    const updateComponent = () => {
      const oldEffects = self.effects

      // Schedule an update for the next microtask if the component
      // effects from the previous render are still being enabled.
      if (oldEffects?.partiallyEnabled) {
        if (updateScheduled) {
          return
        }
        updateScheduled = true
        return queueMicrotask(() => {
          updateScheduled = false

          // Do nothing if the component instance was unmounted.
          if (oldEffects.mounted) {
            self.update()
          }
        })
      }

      let { rootNode, updates, newEffects } = self.startRender()

      currentMode.push('ref')
      currentComponent.push(self)
      currentEffects.push(newEffects)

      // Apply cached parent context if re-rendering.
      const restoreContext = oldEffects ? forwardContext(context, true) : noop

      // If there are enabled component effects, we are mounted.
      const isMounted = !!oldEffects && oldEffects.enabled

      let threw = true
      try {
        let newRootNode: JSX.ChildrenProp = render(props)

        if (isFunction(newRootNode)) {
          newRootNode = fromElementThunk(newRootNode)
        }

        // TODO: support ShadowRoot component roots
        if (isShadowRoot(newRootNode)) {
          throw Error('ShadowRoot cannot be returned by component')
        }

        // When this is true, a comment node will be used as a placeholder, so
        // the component can insert a node later.
        let placeholder: Comment | false

        if (rootNode) {
          placeholder = isComment(rootNode) && rootNode

          // The render function might return an element reference.
          if (rootNode === newRootNode) {
            const key = kAlienElementKey(rootNode)!
            const update = updates.get(key)
            if (update) {
              newRootNode = update
            }
          }
        }

        // When this is true, the root node has been updated in place.
        let updated: boolean | undefined

        if (rootNode !== newRootNode) {
          if (newRootNode != null) {
            // When a non-node is returned, wrap it in a fragment.
            if (!isNode(newRootNode) && !isDeferredNode(newRootNode)) {
              newRootNode = wrapWithFragment(
                newRootNode,
                self.context,
                /* isDeferred */ rootNode != null
              )
            }

            // Update the root node if possible.
            if (rootNode && isDeferredNode(newRootNode)) {
              // Patch the old node if the new node is compatible.
              let compatible: boolean | undefined

              const key = kAlienElementKey(newRootNode)
              if (key === self.rootKey) {
                if (newRootNode.tag === Fragment) {
                  compatible = isFragment(rootNode)
                } else if (isString(newRootNode.tag)) {
                  compatible = compareNodeNames(
                    rootNode.nodeName,
                    newRootNode.tag
                  )
                } else {
                  const tags = kAlienElementTags(rootNode)
                  if (tags) {
                    compatible = tags.has(newRootNode.tag)
                  }
                }
              }

              if (compatible) {
                if (isFragment(rootNode)) {
                  morphFragment(rootNode, newRootNode, self)
                  updated = true
                } else if (isElement(rootNode)) {
                  morph(rootNode, newRootNode, self)
                  updated = true
                }
              }
            }
          }

          // Initialize or replace the root node.
          if (!updated) {
            if (isDeferredNode(newRootNode)) {
              // The next root node must be a DOM node.
              newRootNode = evaluateDeferredNode(newRootNode)
            }

            if (
              newRootNode &&
              isFragment(newRootNode) &&
              !newRootNode.childNodes.length
            ) {
              // Empty fragments disappear.
              newRootNode = null
            }

            // Use a comment node as a placeholder if nothing was produced.
            if (!newRootNode) {
              placeholder ||= document.createComment(DEV ? componentName() : '')
              newRootNode = placeholder
            }
            // Fragments always have a component-specific comment node as
            // their first child, which is how a fragment can be replaced.
            else if (rootNode !== newRootNode && isFragment(newRootNode)) {
              prependFragmentHeader(newRootNode, DEV ? componentName() : '')
            }

            // Replace the old root node if one exists and wasn't replaced by a
            // deeper component already.
            if (rootNode && !fromSameDeeperComponent(rootNode, newRootNode)) {
              if (isFragment(rootNode)) {
                // Remove any nodes owned by the old fragment.
                const oldNodes = kAlienFragmentNodes(rootNode)!
                if (oldNodes[0].parentElement) {
                  oldNodes.slice(1).forEach(node => unmount(node))
                }
                // Replace the fragment's header (which is always a comment).
                rootNode = oldNodes[0] as Comment
              }

              // We can't logically replace a node with no parent.
              if (rootNode.parentElement) {
                rootNode.replaceWith(newRootNode)
                unmount(rootNode, true, self)
              } else if (DEV) {
                console.error(
                  'Component was updated before its initial node could be added to the DOM, resulting in a failed update!'
                )
              }
            }

            if (rootNode) {
              const parentFragment = kAlienParentFragment(rootNode)
              if (parentFragment) {
                kAlienParentFragment(newRootNode, parentFragment)
                updateParentFragment(
                  parentFragment,
                  kAlienFragmentNodes(rootNode) || [rootNode as AnyElement],
                  kAlienFragmentNodes(newRootNode) || [
                    newRootNode as AnyElement,
                  ]
                )
              }
            }

            self.setRootNode((rootNode = newRootNode))
          }
        } else if (!rootNode) {
          placeholder = document.createComment(DEV ? componentName() : '')
          self.setRootNode((rootNode = placeholder))
        }

        if (!rootNode) {
          throw Error('Component failed to render a node')
        }

        threw = false
      } finally {
        restoreContext()

        currentEffects.pop(newEffects)
        currentComponent.pop(self)
        currentMode.pop('ref')

        self.endRender(threw)
        oldPropChanged = false
        newPropAdded = false
      }

      // When the root node is a fragment, use its first child to determine if
      // the fragment has been connected to the DOM.
      if (isFragment(rootNode)) {
        rootNode = kAlienFragmentNodes(rootNode)![0]
      }

      if (isMounted && rootNode.isConnected) {
        newEffects.enable()
        oldEffects.disable()
      } else {
        // If the root node isn't connected to the DOM in the next microtask,
        // use a mutation observer. Once connected, run any component effects.
        const shadowRoot = context.get(ShadowRootContext)
        queueMicrotask(() => {
          if (self.effects === newEffects) {
            newEffects.enableOnceMounted(rootNode, shadowRoot?.value)
          }
        })
      }
    }

    self.enable(updateComponent)
    return self.rootNode
  }

  kAlienRenderFunc(Component, render)
  kAlienSelfUpdating(Component, Component)
  return Component
}

/**
 * If the current node and the new node are both returned by the
 * same component instance, we should avoid any mutation, since
 * that's been handled by the deeper component.
 *
 * This function assumes `newRootNode` hasn't had the caller added
 * to its `kAlienElementTags` map yet.
 */
function fromSameDeeperComponent(
  rootNode: ChildNode | DocumentFragment,
  newRootNode: ChildNode | DocumentFragment
) {
  if (rootNode === newRootNode) {
    return true
  }
  const newInstances = kAlienElementTags(newRootNode)
  if (newInstances) {
    const instances = kAlienElementTags(rootNode)!
    for (const [tag, instance] of instances) {
      return newInstances.get(tag) === instance
    }
  }
  return false
}
