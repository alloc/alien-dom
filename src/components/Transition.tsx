import { isFunction, isPromiseLike } from '@alloc/is'
import type { Falsy } from '@alloc/types'
import { AnimatedProps, SpringAnimation, animate } from '../addons/animate'
import { Promisable } from '../addons/promises'
import { restoreComponentRefs } from '../functions/restoreComponentRefs'
import { toElements } from '../functions/toElements'
import { isNode } from '../functions/typeChecking'
import { useEffect } from '../hooks/useEffect'
import { useState } from '../hooks/useState'
import { kAlienFragmentNodes } from '../internal/symbols'
import type { AnyElement, StyleAttributes } from '../internal/types'
import { Fragment } from '../jsx-dom/jsx-runtime'
import { evaluateDeferredNode, isDeferredNode } from '../jsx-dom/node'
import { morphFragment } from '../morphdom/morphFragment'
import { DOMClassAttribute } from '../types'
import type { JSX } from '../types/jsx'

const nothing = Symbol('nothing')

/** The style applied to the container that wraps leaving elements. */
const leaveStyle: StyleAttributes = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
}

export type TransitionData<Id> = {
  id: Id
  element: JSX.Element
  relatedId: Id | undefined
}

export type TransitionDependency = PromiseLike<any> & {
  stop(): void
}

const dependencies = new WeakMap<AnyElement, TransitionDependency>()

export type TransitionAnimation =
  | SpringAnimation<JSX.Element>
  | SpringAnimation<JSX.Element>[]
  | TransitionDependency
  | Falsy

export type TransitionProp<Id, Data = {}> =
  | ((data: TransitionData<Id> & Data) => TransitionAnimation)
  | TransitionAnimation

export type TransitionProps<Id> = {
  /** The unique identifier for the current entered element. */
  id: Id
  beforeEnter?: (
    data: TransitionData<Id> & { initial: boolean }
  ) => Promisable<any>
  initial?: AnimatedProps<JSX.Element> | boolean
  enter?: TransitionProp<Id, { initial: boolean }>
  leave?: TransitionProp<Id>
  leaveClass?: DOMClassAttribute
  /** The element to be animated can be selected from the direct child. */
  selector?: string
  children: JSX.ChildrenProp
}

export function Transition<Id>(props: TransitionProps<Id>) {
  const state = useState(initialState)

  const previousId = state.currentId
  const leavingElements = Array.from(
    state.elements,
    ([id, element]) => id !== props.id && element
  ).filter(Boolean)

  const reusedChildren = state.children.get(props.id)
  if (reusedChildren) {
    const elements = state.elements.get(props.id)
    if (isNode(elements)) {
      // Restore the nodes of the fragment.
      const childNodes = kAlienFragmentNodes(reusedChildren)!
      elements.childNodes.forEach((childNode, index) => {
        childNodes[index + 1] = childNode
      })
    }
    restoreComponentRefs(reusedChildren)
  }

  let newLeavingElements: AnyElement[] | undefined
  let newEnteredElements: AnyElement[] | undefined
  let initial = false

  // We must wrap props.children in a fragment so that jsx-dom can
  // replace any element references with their latest versions (or a
  // placeholder if nothing changed).
  let children = Fragment(props)

  if (isDeferredNode(children)) {
    if (reusedChildren) {
      children = morphFragment(reusedChildren, children)
    } else {
      children = evaluateDeferredNode(children) as DocumentFragment
    }
  }

  // If the ID changed or this is the first render...
  if (props.id !== previousId) {
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
      if (props.selector) {
        newEnteredElements = newEnteredElements.flatMap(element =>
          Array.from(element.querySelectorAll(props.selector!))
        )
      }
      state.children.set(props.id, children)
      state.elements.set(props.id, newEnteredElements)
    } else {
      state.children.delete(props.id)
      state.elements.delete(props.id)
    }

    if (previousId !== nothing) {
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
    const enter = (
      element: Element,
      data: TransitionData<Id> & { initial: boolean }
    ) => {
      const oldDependency = dependencies.get(element)
      oldDependency?.stop()

      let transition = isFunction(props.enter) ? props.enter(data) : props.enter

      if (isDependency(transition)) {
        dependencies.set(element, transition)
      } else if (transition) {
        const { initial } = props
        if (previousId === nothing) {
          if (initial === false) {
            transition = alterTransition(transition, t => {
              return { ...t, immediate: true }
            })
          } else if (initial && initial !== true) {
            transition = alterTransition(transition, t => {
              return { ...t, from: { ...t.from, ...initial } }
            })
          }
        }
        animate(element as JSX.Element, transition)
      }
    }

    newEnteredElements?.forEach(element => {
      const data = {
        id: props.id,
        element: element as JSX.Element,
        initial,
        relatedId: previousId,
      }

      if (props.beforeEnter) {
        const result = props.beforeEnter(data)
        if (isPromiseLike(result)) {
          let stopped = false
          const dependency: TransitionDependency = {
            then: result.then.bind(result),
            stop() {
              stopped = true
            },
          }
          dependencies.set(element, dependency)
          dependency.then(() => {
            if (!stopped) {
              enter(element, data)
            }
          })
        } else {
          enter(element, data)
        }
      } else {
        enter(element, data)
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
          const oldDependency = dependencies.get(element)
          oldDependency?.stop()

          let transition = isFunction(props.leave)
            ? props.leave({
                id: previousId,
                element: element as JSX.Element,
                relatedId: props.id,
              })
            : props.leave

          if (isDependency(transition)) {
            dependencies.set(element, transition)
            return transition.then(onTransitionEnd)
          }

          if (transition) {
            transition = alterTransition(
              transition,
              (transition, index, endIndex) => {
                if (index < endIndex) return
                const { onRest } = transition
                return {
                  ...transition,
                  onRest: (...args) => {
                    onRest?.(...args)
                    onTransitionEnd()
                  },
                }
              }
            )
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

const initialState = (): {
  currentId: any
  /** The most recent `children` prop for each `id` prop. */
  children: Map<any, DocumentFragment>
  /** The animated elements of each `id` prop. */
  elements: Map<any, AnyElement | AnyElement[]>
} => ({
  currentId: nothing,
  children: new Map(),
  elements: new Map(),
})

function isDependency(value: any): value is TransitionDependency {
  return (
    value &&
    typeof value.then === 'function' &&
    typeof value.stop === 'function'
  )
}

function alterTransition(
  transition: SpringAnimation<JSX.Element> | SpringAnimation<JSX.Element>[],
  callback: (
    transition: SpringAnimation<JSX.Element>,
    index: number,
    endIndex: number
  ) => SpringAnimation<JSX.Element> | Falsy
) {
  if (Array.isArray(transition)) {
    let newTransition: SpringAnimation<JSX.Element>[] | undefined
    transition.forEach((t, i) => {
      const result = callback(t, i, transition.length - 1)
      if (result) {
        newTransition ||= [...transition]
        newTransition[i] = result
      }
    })
    return newTransition || transition
  }
  const newTransition = callback(transition, 0, 0)
  return newTransition || transition
}
