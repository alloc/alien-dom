import type { JSX } from '../types/jsx'
import type { DefaultElement } from '../internal/types'
import { ref, attachRef } from '../signals'
import {
  kAlienEffects,
  kAlienElementKey,
  kAlienSelfUpdating,
  kAlienRenderFunc,
} from '../internal/symbols'
import {
  currentComponent,
  currentEffects,
  currentMode,
} from '../internal/global'
import { updateElement } from '../internal/updateElement'
import { updateFragment } from '../internal/updateFragment'
import { kAlienFragment } from '../internal/symbols'
import { AlienComponent } from '../internal/component'
import { currentContext, ContextStore } from '../context'
import { isFragment } from '../jsx-dom/util'
import {
  kCommentNodeType,
  kFragmentNodeType,
  kElementNodeType,
} from '../internal/constants'

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
      if (self.newEffects) {
        throw Error('Cannot update props during render')
      }
      for (const key in newProps) {
        if (props.hasOwnProperty(key)) {
          props[key] = newProps[key] as any
        } else {
          didSetProp(key, newProps[key])
        }
      }
      if (oldPropChanged || newPropAdded) {
        self.update()
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
      if (oldPropChanged || newPropAdded) {
        self.update()
      }
    }

    const self = new AlienComponent(
      currentComponent.get(),
      Component as any,
      props,
      context,
      reinitProps,
      updateProps
    )

    const updateComponent = () => {
      let { rootNode, newElements, newEffects, newRefs } = self.startRender()

      currentMode.push('ref')
      currentComponent.push(self)
      currentEffects.push(newEffects)

      let threw = true
      let newRootNode: DefaultElement | DocumentFragment | null | undefined
      try {
        newRootNode = render(props, updateProps)
        threw = false
      } finally {
        currentEffects.pop(newEffects)
        currentComponent.pop(self)
        currentMode.pop('ref')

        if (threw) {
          self.endRender(true)
        }
      }

      // If there are enabled component effects, we are mounted.
      const oldEffects = self.effects
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
          if (
            newRootNode.nodeType === kFragmentNodeType &&
            newRootNode.childNodes.length > 0
          ) {
            // Document fragments need a placeholder comment node for
            // the component effects to be attached to.
            newRootNode.prepend(
              document.createComment(
                DEV ? (kAlienRenderFunc(render) || render).name : ''
              )
            )
          }

          let updated: boolean | undefined
          if (rootNode && rootNode.nodeType === newRootNode.nodeType) {
            if ((updated = rootNode.nodeType === kElementNodeType)) {
              // Root nodes must have same key for morphing to work.
              const newKey = kAlienElementKey(newRootNode)
              kAlienElementKey(rootNode, newKey)

              // Diff the root nodes and retarget any new effects.
              updateElement(rootNode as Element, newRootNode, self)
            }
            // Fragments have their own update logic.
            else if ((updated = isFragment(rootNode))) {
              // When the root node is an empty fragment, we have to
              // create a placeholder comment node.
              needsPlaceholder = !newRootNode.childNodes.length

              if (!needsPlaceholder) {
                updateFragment(rootNode, newRootNode as any, newRefs)
              }
            }
          }

          // If the rootNode and newRootNode have different node types,
          // then we can do a simple replacement.
          if (!updated) {
            rootNode?.replaceWith(newRootNode)
            self.setRootNode((rootNode = newRootNode))
          }
        } else {
          // Use a placeholder if the new root node is falsy.
          needsPlaceholder = true
        }

        // If nothing is returned (e.g. null, undefined, empty fragment),
        // use a comment node to hold the position of the element.
        if (needsPlaceholder && rootNode?.nodeType !== kCommentNodeType) {
          const placeholder = document.createComment(
            DEV ? (kAlienRenderFunc(render) || render).name : ''
          )

          if (rootNode) {
            if (isFragment(rootNode)) {
              const oldNodes = kAlienFragment(rootNode)!
              oldNodes[0].before(placeholder)
              oldNodes.forEach(node => node.remove())
              kAlienFragment(rootNode, [placeholder])
            } else if (rootNode.nodeType === kElementNodeType) {
              const oldEffects = kAlienEffects(rootNode)
              oldEffects?.disable()
              rootNode.replaceWith(placeholder)
            }
          }

          self.setRootNode((rootNode = placeholder))
        }
      }

      if (!rootNode) {
        throw Error('expected root node to exist')
      }

      if (isMounted && rootNode.isConnected) {
        newEffects.enable()
        oldEffects.disable()
      } else {
        // If the root node isn't added to a JSX parent node by the next
        // microtask, assume the node has been or will be added to the
        // DOM with native methods.
        queueMicrotask(() => {
          if (!newEffects.enabled && self.effects === newEffects) {
            newEffects.setElement(rootNode)
            oldEffects?.setElement(null)
          }
        })
      }

      self.endRender()
      oldPropChanged = false
      newPropAdded = false
    }

    self.enable(updateComponent)
    return self.rootNode
  }

  kAlienSelfUpdating(Component, render)
  return Component
}
