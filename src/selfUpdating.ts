import morph from 'morphdom'
import { effect } from '@preact/signals-core'
import { ref, refs as toRefs, attachRef } from './signals'
import { AlienComponent, AnyElement, DefaultElement } from './internal/types'
import { kAlienPlaceholder, setSymbol } from './symbols'
import { kAlienElementKey, kAlienSelfUpdating } from './symbols'
import { currentComponent, currentHooks } from './global'
import { AlienHooks } from './hooks'
import { assignTag } from './internal/tags'
import { AlienElement } from './element'
import { ElementKey } from '../types/attr'

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
  Element extends AnyElement = DefaultElement
>(
  render: (props: Props, update: (props: Partial<Props>) => void) => Element
): (props: Props) => Element {
  const Component = (initialProps: Props): any => {
    // Once a prop is mutated from inside, it's considered stateful.
    // This means it can't be updated from outside unless the element's
    // key is changed.
    const statefulProps = new Set<keyof any>()
    const addStatefulProp = (key: keyof any) => {
      // When a parent component rebinds an initial prop, do nothing.
      if (!isInitialProp) {
        statefulProps.add(key)
      }
    }

    let isInitialProp = false
    const rebindInitialProp = (key: keyof Props, value: any) => {
      if (!statefulProps.has(key)) {
        if (props.hasOwnProperty(key)) {
          isInitialProp = true
          props[key] = value
          isInitialProp = false
        } else {
          attachRef(props, key, ref(value), addStatefulProp)
        }
      }
    }

    let scope: AlienComponent
    let element: AlienElement<Element> | undefined
    let refs: Map<ElementKey, AnyElement> | undefined
    let pause: (() => void) | undefined
    let isRendering = false

    const props = toRefs(initialProps, addStatefulProp)
    pause = effect(rerender)

    function rerender() {
      const newRefs = new Map<ElementKey, AnyElement>()
      const newHooks = new AlienHooks<Element>()
      const newScope = currentComponent.push({
        hooks: newHooks,
        memory: scope?.memory || [],
        memoryIndex: 0,
        fromRef: Map.prototype.get.bind(refs || newRefs),
        setRef(key, element) {
          setSymbol(element, kAlienElementKey, key)
          newRefs.set(key, element)
        },
      })

      isRendering = true
      currentHooks.push(newHooks)

      let newElement: AlienElement<Element> | undefined
      try {
        newElement = render(props, newProps => {
          if (isRendering) {
            throw Error('Cannot update props during render')
          }
          for (const key in newProps) {
            const value: any = newProps[key]
            if (props.hasOwnProperty(key)) {
              props[key] = value
            } else {
              attachRef(props, key, ref(value))
              addStatefulProp(key)
              if (pause) {
                pause()
                pause = effect(rerender)
              }
            }
          }
        }) as any
      } finally {
        currentHooks.pop(newHooks)
        currentComponent.pop(newScope)
        if (!newElement) {
          isRendering = false
          return
        }
      }

      if (element) {
        scope.hooks.disable()

        const key = (newElement as any)[kAlienElementKey]
        if (key != null) {
          scope.setRef(key, element)
        }

        // The render function may return the same element if it keeps a
        // local reference to it. In that case, the element is already
        // updated by now.
        if (element != newElement) {
          updateElement(element, newElement, newHooks)
        }
      } else {
        element = newElement
        if (!element.hasOwnProperty(kAlienElementKey)) {
          // Ensure the element is ignored by self-updating ancestors.
          // Use a negative random number to avoid conflicts with static
          // keys and common dynamic keys.
          setSymbol(element, kAlienElementKey, -String(Math.random()).slice(2))
        }
      }

      newHooks.setElement(element)
      newHooks.enable(() => {
        if (!isRendering) {
          pause ||= effect(rerender)
        }
        return () => {
          if (!isRendering && pause) {
            pause()
            pause = undefined
          }
        }
      })

      isRendering = false
      scope = newScope
      refs = newRefs
    }

    assignTag(element!, Component, rebindInitialProp)
    return element
  }

  setSymbol(Component, kAlienSelfUpdating, render)
  return Component
}

/** @internal */
export function refElement(id: number, element: AnyElement) {
  const key = ':' + id
  const scope = currentComponent.get()!
  const oldElement = scope.fromRef(key)
  if (oldElement) {
    updateElement(oldElement, element, scope.hooks)
    element = oldElement
  }
  scope.setRef(key, element)
  return element
}

/** @internal */
export function derefElement(key: ElementKey) {
  const scope = currentComponent.get()!
  return scope.fromRef(key)
}

/** @internal */
export function updateElement(
  rootElement: AnyElement,
  newRootElement: AnyElement,
  newHooks?: AlienHooks
) {
  morph(rootElement, newRootElement, {
    // getNodeKey(node: any) {
    //   return node[kAlienElementKey]
    // },
    onBeforeElUpdated(oldElement, newElement) {
      const shouldUpdate =
        oldElement == rootElement ||
        !oldElement.hasOwnProperty(kAlienElementKey)

      if (shouldUpdate) {
        // Move hooks from the new element to the old element.
        newHooks?.enablers?.forEach(enabler => {
          if (enabler.target == newElement) {
            newHooks.enable(enabler as any, oldElement)
          }
        })
      }
      return shouldUpdate
    },
    onBeforeNodeAdded(node: any): any {
      if (node[kAlienPlaceholder]) {
        debugger
        return false
      }
    },
    onBeforeNodeDiscarded(node: any): any {
      if (node[kAlienPlaceholder]) {
        debugger
        return false
      }
    },
  })
}
