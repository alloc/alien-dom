import { isFunction } from '@alloc/is'
import { ContextStore, currentContext, forwardContext } from '../context'
import { applyInitialPropsRecursively } from '../internal/applyProp'
import { AlienComponent } from '../internal/component'
import { kCommentNodeType } from '../internal/constants'
import { isElement, isFragment, isNode } from '../internal/duck'
import { toChildNodes } from '../internal/fragment'
import { fromElementThunk } from '../internal/fromElementThunk'
import {
  currentComponent,
  currentEffects,
  currentMode,
} from '../internal/global'
import { isConnected } from '../internal/isConnected'
import {
  kAlienEffects,
  kAlienElementKey,
  kAlienFragment,
  kAlienParentFragment,
  kAlienRenderFunc,
  kAlienSelfUpdating,
} from '../internal/symbols'
import type { AnyElement } from '../internal/types'
import { updateElement } from '../internal/updateElement'
import {
  updateFragment,
  updateParentFragment,
} from '../internal/updateFragment'
import { ShadowRootContext, prepareFragment } from '../jsx-dom/appendChild'
import { Fragment } from '../jsx-dom/jsx-runtime'
import { isShadowRoot } from '../jsx-dom/shadow'
import { noop } from '../jsx-dom/util'
import { ref } from '../observable'
import type { JSX } from '../types/jsx'
import { attachRef } from './attachRef'

/**
 * Create a self-updating component whose render function can mutate its
 * props to re-render itself. The original element is morphed into the
 * new element (using `morphdom`).
 *
 * The given `render` function must be pure (no side effects), but its
 * event listeners can have side effects. Another exception is that any
 * object created within the render function can be mutated freely.
 */
export function selfUpdating<Props extends object, Result extends JSX.Children>(
  render: (props: Readonly<Props>) => Result
): (props: Props) => Result {
  const componentName = DEV
    ? () =>
        (kAlienRenderFunc(render) || kAlienRenderFunc(Component) || render)
          .name || (Component as any).displayName
    : noop

  const Component = (initialProps: Props): any => {
    const props = {} as Props
    const context = new ContextStore(currentContext)

    for (const key in initialProps) {
      const initialValue = initialProps[key]
      attachRef(props, key, ref(initialValue))
    }

    let isPropUpdate = false
    let oldPropChanged = false
    let newPropAdded = false

    const updateProps = (newProps: Partial<Props>) => {
      for (const key in newProps) {
        isPropUpdate = true
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
        isPropUpdate = false
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
    )

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

      let { rootNode, newElements, newEffects, newRefs } = self.startRender()

      currentMode.push('ref')
      currentComponent.push(self)
      currentEffects.push(newEffects)

      // Apply cached parent context if re-rendering.
      const restoreContext = oldEffects ? forwardContext(context, true) : noop

      let threw = true
      let newRootNode: JSX.Children
      try {
        newRootNode = render(props)
        if (isFunction(newRootNode)) {
          newRootNode = fromElementThunk(newRootNode as any)
        }
        if (isShadowRoot(newRootNode)) {
          // TODO: support ShadowRoot morphing
          throw Error('ShadowRoot cannot be returned by component')
        }
        if (newRootNode != null && !isNode(newRootNode)) {
          newRootNode = Fragment({ children: newRootNode })
        }
        threw = false
      } finally {
        restoreContext()
        currentEffects.pop(newEffects)
        currentComponent.pop(self)
        currentMode.pop('ref')

        if (threw) {
          self.endRender(true)
        }
      }

      // If there are enabled component effects, we are mounted.
      const isMounted = !!oldEffects && oldEffects.enabled

      // The render function might return an element reference.
      if (rootNode && rootNode === newRootNode) {
        const key = kAlienElementKey(rootNode)!
        const newElement = newElements.get(key)
        if (newElement) {
          newRootNode = newElement
        }
      }

      if (!rootNode || rootNode !== newRootNode) {
        // When this is true, a comment node will be used as a
        // placeholder, so the component can insert a node later.
        let needsPlaceholder: boolean | undefined

        if (newRootNode) {
          if (isFragment(newRootNode)) {
            if (newRootNode.childNodes.length) {
              // Document fragments need a placeholder comment node for
              // the component effects to be attached to.
              newRootNode.prepend(
                document.createComment(DEV ? componentName() : '')
              )
            } else {
              // When the root node is an empty fragment, we have to
              // create a placeholder comment node.
              needsPlaceholder = true
            }
          }

          let updated: boolean | undefined
          if (
            rootNode &&
            rootNode.nodeType === newRootNode.nodeType &&
            self.rootKey === kAlienElementKey(newRootNode)
          ) {
            if ((updated = isFragment(rootNode))) {
              if (!needsPlaceholder) {
                updateFragment(rootNode, newRootNode as any, newRefs, self)
              }
            } else if (isElement(rootNode)) {
              if ((updated = rootNode.nodeName === newRootNode.nodeName)) {
                // Root nodes must have same key for morphing to work.
                const newKey = kAlienElementKey(newRootNode)
                kAlienElementKey(rootNode, newKey)

                // Diff the root nodes and retarget any new effects.
                updateElement(rootNode, newRootNode as any, self)
              }
            }
          }

          // If the root node could not be updated, replace it instead.
          if (!updated && !needsPlaceholder) {
            if (isElement(newRootNode)) {
              applyInitialPropsRecursively(newRootNode)
            } else if (isFragment(newRootNode)) {
              newRootNode.childNodes.forEach(childNode => {
                if (isElement(childNode)) {
                  applyInitialPropsRecursively(childNode)
                }
              })
            }
            if (rootNode) {
              if (isFragment(rootNode)) {
                // Replace the comment placeholder with the new root
                // node. But first, remove any other nodes added by the
                // old fragment.
                const oldNodes = toChildNodes(rootNode)
                if (oldNodes[0].parentElement) {
                  oldNodes.slice(1).forEach(node => node.remove())
                }
                rootNode = oldNodes[0] as Comment
              }
              if (rootNode.parentElement) {
                if (isFragment(newRootNode)) {
                  newRootNode = prepareFragment(newRootNode, self)
                }
                const parentFragment = kAlienParentFragment(rootNode)
                if (parentFragment) {
                  kAlienParentFragment(newRootNode, parentFragment)
                  updateParentFragment(
                    parentFragment,
                    [rootNode],
                    kAlienFragment(newRootNode) || [newRootNode as AnyElement]
                  )
                }
                // If the rootNode and newRootNode have different
                // nodeType or nodeName properties, then we can do a
                // simple replacement.
                rootNode.replaceWith(newRootNode)
              }
            }
            self.setRootNode((rootNode = newRootNode))
          }
        } else {
          // Use a placeholder if the new root node is falsy.
          needsPlaceholder = true
        }

        // If nothing is returned (e.g. null, undefined, empty fragment),
        // use a comment node to hold the position of the element.
        if (needsPlaceholder && rootNode?.nodeType !== kCommentNodeType) {
          const placeholder = document.createComment(DEV ? componentName() : '')

          if (rootNode) {
            if (isFragment(rootNode)) {
              const oldNodes = kAlienFragment(rootNode)!
              oldNodes[0].before(placeholder)
              oldNodes.forEach(node => node.remove())
              kAlienFragment(rootNode, [placeholder])
            } else if (isElement(rootNode)) {
              const oldEffects = kAlienEffects(rootNode)
              oldEffects?.disable()
              rootNode.replaceWith(placeholder)
            }
          }

          self.setRootNode((rootNode = placeholder))
        }
      }

      self.endRender()
      oldPropChanged = false
      newPropAdded = false

      if (!rootNode) {
        throw Error('expected root node to exist')
      }

      if (isMounted && isConnected(rootNode)) {
        newEffects.enable()
        oldEffects.disable()
      } else {
        // If the root node isn't added to a JSX parent node by the next
        // microtask, assume the node has been or will be added to the
        // DOM with native methods.
        queueMicrotask(() => {
          if (!newEffects.enabled && self.effects === newEffects) {
            const shadowRoot = context.get(ShadowRootContext)
            newEffects.enableOnceMounted(rootNode, shadowRoot?.value)
          }
        })
      }
    }

    self.enable(updateComponent)
    return self.rootNode
  }

  kAlienSelfUpdating(Component, render)
  return Component
}
