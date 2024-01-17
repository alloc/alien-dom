import { isArray, isFunction } from '@alloc/is'
import type { AnyFn, Falsy } from '@alloc/types'
import { SpringAnimation, animate } from '../animate'
import { restoreComponentRefs } from '../functions/restoreComponentRefs'
import { selfUpdating } from '../functions/selfUpdating'
import { toElements } from '../functions/toElements'
import { useEffect } from '../hooks/useEffect'
import { useState } from '../hooks/useState'
import { isNode } from '../internal/duck'
import { kAlienFragmentNodes } from '../internal/symbols'
import type { AnyElement, StyleAttributes } from '../internal/types'
import { Fragment } from '../jsx-dom/jsx-runtime'
import { evaluateDeferredNode } from '../jsx-dom/node'
import { morphFragment } from '../morphdom/morphFragment'
import { DOMClassAttribute } from '../types'
import type { JSX } from '../types/jsx'

/** The style applied to the container that wraps leaving elements. */
const leaveStyle: StyleAttributes = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
}

export type TransitionData<T> = {
  id: T
  element: JSX.Element
  relatedId: T | undefined
}

export type TransitionEnterData<T> = TransitionData<T> & {
  initial: boolean
}

export type TransitionAnimation<Data extends TransitionData<any>> =
  | ((data: Data) => Exclude<TransitionAnimation<Data>, AnyFn>)
  | SpringAnimation<JSX.Element>
  | SpringAnimation<JSX.Element>[]
  | Falsy

export function Transition<T>(props: {
  /** The unique identifier for the current entered element. */
  id: T
  enter?: TransitionAnimation<TransitionEnterData<T>>
  leave?: TransitionAnimation<TransitionData<T>>
  leaveClass?: DOMClassAttribute
  children: JSX.ChildrenProp
}) {
  const state = useState(initialState)

  const previousId = props.id !== state.currentId ? state.currentId : undefined
  const leavingElements = Array.from(
    state.elements,
    ([id, element]) => id !== props.id && element
  ).filter(Boolean)

  const reusedChildren = state.children.get(props.id)
  if (reusedChildren) {
    restoreComponentRefs(reusedChildren)
  }

  let newLeavingElements: AnyElement[] | undefined
  let newEnteredElements: AnyElement[] | undefined
  let initial = false

  // We must wrap props.children in a fragment so that jsx-dom can
  // replace any element references with their latest versions (or a
  // placeholder if nothing changed).
  let children = Fragment(props)

  if (isNode(children)) {
    console.debug('children is a fragment node')
  } else {
    console.debug('children is a deferred fragment')
    if (reusedChildren) {
      children = morphFragment(reusedChildren, children)
      console.debug('morphed children')
    } else {
      children = evaluateDeferredNode(children) as DocumentFragment
      console.debug('evaluated children')
    }
  }

  // If the ID changed or this is the first render...
  if (previousId !== undefined || state.children.size === 0) {
    state.currentId = props.id

    if (reusedChildren) {
      const reusedElements = state.elements.get(props.id)!
      if (Array.isArray(reusedElements)) {
        // If an array is found, then no elements were rendered before,
        // so this an empty array was stored (and never wrapped).
        newEnteredElements = reusedElements
      } else {
        // Leaving elements are wrapped in an absolute-positioned
        // container, which we want to remove now that the elements are
        // re-entering.
        newEnteredElements = Array.from(reusedElements.children)
        state.elements.set(props.id, newEnteredElements)
      }
    } else if (children.childNodes.length) {
      initial = true
      newEnteredElements = toElements(children)
      state.children.set(props.id, children)
      state.elements.set(props.id, newEnteredElements)
    } else {
      state.children.delete(props.id)
      state.elements.delete(props.id)
    }

    if (previousId !== undefined) {
      const previousChildren = state.children.get(previousId)!
      newLeavingElements = toElements(previousChildren)

      if (newLeavingElements.length) {
        // Use a random key to prevent morphdom from merging two "leave
        // containers" together.
        const leaveKey = Math.random()
        const leaveContainer = (
          <div key={leaveKey} class={props.leaveClass} style={leaveStyle} />
        )
        for (const leavingNode of kAlienFragmentNodes(previousChildren)!) {
          leavingNode && leaveContainer.append(leavingNode)
        }

        const previousElements = state.elements.get(previousId)!
        const previousIndex = leavingElements.indexOf(previousElements)
        state.elements.set(previousId, leaveContainer)
        leavingElements[previousIndex] = leaveContainer
      }
    }
  }

  useEffect(() => {
    newEnteredElements?.forEach(element => {
      const transition = isFunction(props.enter)
        ? props.enter({
            id: props.id,
            element: element as JSX.Element,
            initial,
            relatedId: previousId,
          })
        : props.enter

      if (transition) {
        // Unset the `from` prop if the element is re-entering.
        if (reusedChildren) {
          const t = isArray(transition) ? transition[0] : transition
          t.from = undefined
        }
        console.log('%s/enter', props.id, transition)
        animate(element as JSX.Element, transition)
      }
    })

    if (newLeavingElements) {
      if (newLeavingElements.length) {
        const leaveContainer = state.elements.get(previousId) as JSX.Element

        let leavingCount = newLeavingElements.length
        const onTransitionEnd = () => {
          if (--leavingCount === 0) {
            leaveContainer.remove()
            state.children.delete(previousId)
            state.elements.delete(previousId)
          }
        }

        newLeavingElements.forEach(element => {
          let transition = isFunction(props.leave)
            ? props.leave({
                id: previousId,
                element: element as JSX.Element,
                relatedId: props.id,
              })
            : props.leave

          if (transition) {
            if (!Array.isArray(transition)) {
              const { onRest } = transition
              transition = {
                ...transition,
                onRest(...args) {
                  onRest?.(...args)
                  onTransitionEnd()
                },
              }
            } else if (transition.length) {
              // Assume the last animation is the last to finish.
              const index = transition.length - 1
              const { onRest } = transition[index]
              transition[index] = {
                ...transition[index],
                onRest(...args) {
                  onRest?.(...args)
                  onTransitionEnd()
                },
              }
            } else {
              transition = false
            }
          }
          if (transition) {
            console.log('%s/leave', previousId, transition)
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
    <Fragment key="0">
      {leavingElements}
      {children}
    </Fragment>
  )
}

// @ts-ignore: Prevent rename to Transition2 by esbuild.
Transition = /* @__PURE__ */ selfUpdating(Transition)

const initialState = (): {
  currentId: any
  /** The most recent `children` prop for each `id` prop. */
  children: Map<any, DocumentFragment>
  /** The animated elements of each `id` prop. */
  elements: Map<any, AnyElement | AnyElement[]>
} => ({
  currentId: undefined,
  children: new Map(),
  elements: new Map(),
})
