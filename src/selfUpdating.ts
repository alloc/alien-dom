import { effect } from '@preact/signals-core'
import { ref, refs as toRefs, attachRef } from './signals'
import { AlienComponent, DefaultElement } from './internal/types'
import { setSymbol, kAlienHooks, kAlienNewHooks } from './symbols'
import { kAlienElementKey, kAlienSelfUpdating } from './symbols'
import { currentComponent, currentHooks } from './global'
import { AlienHooks } from './hooks'
import { assignTag } from './internal/tags'
import { ElementKey } from './types/attr'
import { updateElement } from './updateElement'

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
  Element extends DefaultElement = DefaultElement
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
          // TODO: force a rerender!
          attachRef(props, key, ref(value), addStatefulProp)
        }
      }
    }

    let scope: AlienComponent | undefined
    let element: DefaultElement | undefined
    let refs: Map<ElementKey, DefaultElement> | undefined
    let pause: (() => void) | undefined
    let isRendering = false

    const props = toRefs(initialProps, addStatefulProp)
    pause = effect(rerender)

    function rerender() {
      let newHooks = new AlienHooks<DefaultElement>()

      const newRefs = new Map<ElementKey, DefaultElement>()
      const newElements = new Map<ElementKey, DefaultElement>()
      const newScope = currentComponent.push({
        hooks: newHooks,
        memory: scope?.memory || [],
        memoryIndex: 0,
        newElements,
        fromRef: Map.prototype.get.bind(refs || newRefs),
        setRef(key, element) {
          setSymbol(element, kAlienElementKey, key)
          newRefs.set(key, element)

          const oldHooks: AlienHooks | undefined = (element as any)[kAlienHooks]
          if (oldHooks?.enabled) {
            // If the component accesses the hooks of the old element
            // during render, return the hooks of the new element
            // instead.
            Object.defineProperty(element, kAlienNewHooks, {
              configurable: true,
              get() {
                if (isRendering) {
                  const newElement = newElements.get(key)
                  return newElement?.hooks()
                }
              },
            })
          }
        },
      })

      isRendering = true
      currentHooks.push(newHooks)

      let newElement: DefaultElement | undefined
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
          scope = undefined
          refs = undefined
          return
        }
      }

      if (element === newElement) {
        const key = (element as any)[kAlienElementKey]
        newElement = newElements.get(key)
        if (!newElement) {
          // This is a self-updating element that's not created by this
          // component, so we have to merge our `newHooks` into theirs.
          const hooks = (element as any)[kAlienHooks]
          newHooks.enablers?.forEach(enabler => {
            hooks.enable(enabler as any, enabler.target)
          })
          newHooks = newScope.hooks = hooks
        }
      }

      if (newElement) {
        const hooks: AlienHooks | undefined = (newElement as any)[kAlienHooks]
        if (hooks) {
          // The component added hooks manually during render, so we
          // have to merge those into the `newHooks` object. Before
          // doing that, we call `setElement(null)` to remove the
          // internal `onMount` hook.
          hooks.setElement(null)
          hooks.enablers?.forEach(enabler => {
            newHooks.enable(enabler as any, enabler.target)
          })
        }
        if (element) {
          setSymbol(newElement, kAlienHooks, newHooks)
          updateElement(element, newElement)
        } else {
          element = newElement
          newHooks.setElement(newElement)
        }
      }

      newElements.clear()
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
