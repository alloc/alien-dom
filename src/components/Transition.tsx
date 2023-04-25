import type { Falsy } from '@alloc/types'
import type { JSX } from '../types/jsx'
import type { AnyElement, StyleAttributes } from '../internal/types'
import { selfUpdating } from '../functions/selfUpdating'
import { SpringAnimation, animate } from '../animate'
import { useState } from '../hooks/useState'
import { isElement } from '../jsx-dom/util'
import { useEffect } from '../hooks/useEffect'
import { updateNode } from '../functions/updateNode'
import { ManualUpdates } from './ManualUpdates'
import { Fragment } from '../jsx-dom/jsx-runtime'
import { toElements } from '../functions/toElements'
import { unwrap } from '../internal/element'

/** The style applied to the container that wraps leaving elements. */
const leaveStyle: StyleAttributes = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
}

export const Transition = /* @__PURE__ */ selfUpdating(function <T>(props: {
  id: T
  enter: (
    id: T,
    element: JSX.Element,
    initial: boolean,
    relatedId: T | undefined
  ) => SpringAnimation<JSX.Element> | SpringAnimation<JSX.Element>[] | Falsy
  leave: (
    id: T,
    element: JSX.Element,
    relatedId: T | undefined
  ) => SpringAnimation<JSX.Element> | SpringAnimation<JSX.Element>[] | Falsy
  children: JSX.ElementsProp
}) {
  const state = useState(initialState)

  const previousId = props.id !== state.currentId ? state.currentId : undefined
  const leavingElements = Array.from(
    state.elements,
    ([id, element]) => id !== props.id && id !== previousId && element
  ).filter(Boolean)

  let newLeavingElements: AnyElement[] | undefined
  let newEnteredElements: AnyElement[] | undefined
  let initial = false

  // We must wrap props.children in a fragment so that jsx-dom can
  // replace any element references with their latest versions (or a
  // placeholder if nothing changed).
  let children = Fragment(props)

  const previousChildren = state.children.get(props.id)
  if (previousChildren) {
    updateNode(previousChildren, children)
    children = previousChildren
  }

  if (previousId !== undefined || state.children.size === 0) {
    state.currentId = props.id

    if (children.childNodes.length) {
      if (previousChildren) {
        const previousElements = state.elements.get(props.id)!
        if (Array.isArray(previousElements)) {
          // If an array is found, then no elements were rendered before,
          // so this an empty array was stored (and never wrapped).
          newEnteredElements = previousElements
        } else {
          // Leaving elements are wrapped in an absolute-positioned
          // container, which we want to remove now that the elements are
          // re-entering.
          newEnteredElements = unwrap(previousElements).filter(child =>
            isElement(child)
          ) as JSX.Element[]
        }
      } else {
        initial = true
        newEnteredElements = toElements(children)
        state.children.set(props.id, children)
      }
      state.elements.set(props.id, newEnteredElements)
    } else {
      state.children.delete(props.id)
      state.elements.delete(props.id)
    }

    if (previousId !== undefined) {
      // We can assume the previous elements are an array, because we
      // don't wrap entered elements in a container.
      newLeavingElements = state.elements.get(previousId) as AnyElement[]

      if (newLeavingElements.length) {
        const container = <div key={Math.random()} style={leaveStyle} />
        container.append(...newLeavingElements)
        state.elements.set(previousId, container)
        leavingElements.push(container)
      }
    }
  }

  useEffect(() => {
    newEnteredElements?.forEach(element => {
      const transition = props.enter(
        props.id,
        element as JSX.Element,
        initial,
        previousId
      )
      if (transition) {
        animate(element as JSX.Element, transition)
      }
    })

    if (newLeavingElements) {
      if (newLeavingElements.length) {
        const container = state.elements.get(previousId) as JSX.Element

        let leavingCount = newLeavingElements.length
        const onTransitionEnd = () => {
          if (--leavingCount === 0) {
            container.remove()
            state.children.delete(previousId)
          }
        }

        newLeavingElements.forEach(element => {
          let transition = props.leave(
            previousId,
            element as JSX.Element,
            props.id
          )
          if (transition) {
            if (!Array.isArray(transition)) {
              const { onRest } = transition
              transition.onRest = (...args) => {
                onRest?.(...args)
                onTransitionEnd()
              }
            } else if (transition.length) {
              // Assume the last animation is the last to finish.
              const { onRest } = transition[transition.length - 1]
              transition[transition.length - 1].onRest = (...args) => {
                onRest?.(...args)
                onTransitionEnd()
              }
            } else {
              transition = false
            }
          }
          if (transition) {
            animate(element as JSX.Element, transition)
          } else {
            onTransitionEnd()
          }
        })
      } else {
        state.children.delete(previousId)
      }
    }
  }, [props.id])

  return (
    <ManualUpdates
      // Since this component isn't transformed due to being in
      // node_modules, we have to manually wrap the children with a thunk
      // to ensure the ManualUpdates effect is applied.
      children={() => {
        return [leavingElements, children]
      }}
    />
  )
})

const initialState = (): {
  currentId: any
  /** The most recent `children` prop for each `id` prop. */
  children: Map<any, JSX.Element>
  /** The animated elements of each `id` prop. */
  elements: Map<any, AnyElement | AnyElement[]>
} => ({
  currentId: undefined,
  children: new Map(),
  elements: new Map(),
})
