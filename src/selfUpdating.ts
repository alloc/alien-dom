import { effect } from '@preact/signals-core'
import { ref, attachRef } from './signals'
import { DefaultElement } from './internal/types'
import {
  setSymbol,
  kAlienHooks,
  kAlienElementKey,
  kAlienSelfUpdating,
} from './symbols'
import { currentComponent, currentHooks } from './global'
import { AlienHooks } from './hooks'
import { updateElement, updateFragment } from './updateElement'
import { kAlienFragment } from './symbols'
import { AlienComponent } from './internal/component'
import { currentContext, ContextStore } from './context'
import { JSX } from './types/jsx'
import {
  kCommentNodeType,
  kFragmentNodeType,
  kElementNodeType,
} from './internal/constants'

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
  Element extends JSX.Element = JSX.Element
>(
  render: (
    props: Props,
    update: (props: Partial<Props>) => void
  ) => Element | null | undefined
): (props: Props) => Element {
  const Component = (initialProps: Props): any => {
    let oldPropChanged = false
    let newPropAdded = false

    // The props object passed to the render function.
    const props = {} as Props
    const context = new ContextStore(currentContext)

    // Once a prop is mutated from inside, it's considered stateful.
    // This means it can't be updated from outside unless the element's
    // key is changed.
    const statefulProps = new Set<keyof any>()

    const didSetProp = (key: keyof any, newValue: any, oldValue?: any) => {
      // When a parent component rebinds an initial prop, do nothing.
      if (!isPropReinit) {
        statefulProps.add(key)
      }
      if (!props.hasOwnProperty(key)) {
        attachRef(props, key, ref(newValue))
        newPropAdded = true
      } else if (newValue !== oldValue) {
        oldPropChanged = true
      }
    }

    for (const key in initialProps) {
      attachRef(props, key, ref(initialProps[key]), didSetProp)
    }

    const updateProps = (newProps: Partial<Props>) => {
      if (self.newHooks) {
        throw Error('Cannot update props during render')
      }
      for (const key in newProps) {
        if (props.hasOwnProperty(key)) {
          props[key] = newProps[key] as any
        } else {
          didSetProp(key, newProps[key])
        }
      }
      if (preventUpdates && (oldPropChanged || newPropAdded)) {
        preventUpdates()
        preventUpdates = effect(updateComponent)
      }
    }

    let isPropReinit = false
    const reinitProps = (newProps: Partial<Props>) => {
      for (const key in newProps) {
        if (statefulProps.has(key)) {
          continue
        }
        isPropReinit = true
        if (props.hasOwnProperty(key)) {
          props[key] = newProps[key] as any
        } else {
          didSetProp(key, newProps[key])
        }
        isPropReinit = false
      }
      if (preventUpdates) {
        if (oldPropChanged || newPropAdded) {
          preventUpdates()
          preventUpdates = effect(updateComponent)
        }
      } else {
        // The component is disabled but the parent component is being
        // re-enabled, so we should re-render too.
        preventUpdates = effect(updateComponent)
      }
    }

    /**
     * When non-null, this component will re-render on prop changes and
     * other observables accessed during render.
     */
    let preventUpdates: (() => void) | null

    const enable = () => {
      if (preventUpdates) {
        self.hooks?.enable()
      } else {
        preventUpdates = effect(updateComponent)
      }
    }
    const disable = () => {
      self.hooks?.disable()
      self.hooks = null
      preventUpdates?.()
      preventUpdates = null
    }

    const self = new AlienComponent(
      Component as any,
      props,
      context,
      reinitProps,
      updateProps,
      enable,
      disable
    )

    const updateComponent = () => {
      let { rootNode, newElements, newHooks, newRefs } = self.startRender()

      currentComponent.push(self)
      currentHooks.push(newHooks)

      let threw = true
      let newRootNode: DefaultElement | null | undefined
      try {
        newRootNode = render(props, updateProps)
        threw = false
      } finally {
        currentHooks.pop(newHooks)
        currentComponent.pop(self)

        if (threw) {
          self.endRender(true)
        }
      }

      // If there are enabled component hooks, we are mounted.
      const oldHooks = self.hooks
      const isMounted = !!oldHooks && oldHooks.enabled

      // The render function might return an element reference.
      if (rootNode && rootNode === newRootNode) {
        const key = (rootNode as any)[kAlienElementKey]
        const newElement = newElements.get(key)
        if (newElement) {
          newRootNode = newElement
        }
      }

      if (!rootNode || rootNode !== newRootNode) {
        if (newRootNode) {
          if (newRootNode.nodeType === kFragmentNodeType) {
            // Document fragments need a placeholder comment node for
            // the component hooks to be attached to.
            newRootNode.prepend(document.createComment(''))
          }
          if (rootNode?.nodeType === kElementNodeType) {
            // Root nodes must have same key for morphing to work.
            const newKey = (newRootNode as any)[kAlienElementKey]
            setSymbol(rootNode, kAlienElementKey, newKey)

            // Diff the root nodes and enable the new hooks.
            updateElement(rootNode as Element, newRootNode, self)
          }
          // Fragments have their own update logic.
          else if (rootNode?.nodeType === kFragmentNodeType) {
            if (newRootNode.childNodes.length) {
              updateFragment(rootNode, newRootNode, newRefs)
            } else {
              // Empty fragment needs a placeholder. Setting this to null
              // allows for that.
              newRootNode = null
            }
          } else {
            // The `rootNode` might be a comment node that was being used
            // to hold the position of this element in the DOM.
            rootNode?.replaceWith(newRootNode)
            self.setRootNode((rootNode = newRootNode))
          }
        }

        // If nothing is returned (e.g. null, undefined, empty fragment),
        // use a comment node to hold the position of the element.
        if (!newRootNode && rootNode?.nodeType !== kCommentNodeType) {
          const placeholder = document.createComment('')
          if (rootNode?.nodeType === kElementNodeType) {
            const oldHooks: AlienHooks = (rootNode as any)[kAlienHooks]
            oldHooks?.disable()
            rootNode.replaceWith(placeholder)
          } else if (rootNode?.nodeType === kFragmentNodeType) {
            const oldNodes: ChildNode[] = (rootNode as any)[kAlienFragment]
            oldNodes[0].before(placeholder)
            oldNodes.forEach(node => node.remove())
            setSymbol(rootNode, kAlienFragment, [placeholder])
          }
          self.setRootNode((rootNode = placeholder))
        }
      }

      if (!rootNode) {
        throw Error('expected root node to exist')
      }

      if (isMounted && rootNode.isConnected) {
        newHooks.enable()
        oldHooks.disable()
      } else {
        // If the root node isn't added to a JSX parent node by the next
        // microtask, assume the node has been or will be added to the
        // DOM with native methods.
        queueMicrotask(() => {
          if (!newHooks.enabled && self.hooks === newHooks) {
            newHooks.setElement(rootNode)
            oldHooks?.setElement(null)
          }
        })
      }

      self.endRender()
      oldPropChanged = false
      newPropAdded = false
    }

    preventUpdates = effect(updateComponent)
    return self.rootNode
  }

  setSymbol(Component, kAlienSelfUpdating, render)
  return Component
}
