import { depsHaveChanged } from '../functions/depsHaveChanged'
import {
  kAlienNodeType,
  kChildrenNodeType,
  kElementNodeType,
} from '../internal/constants'
import {
  endOfFragment,
  fragmentToChildNodes,
  wrapWithFragment,
} from '../internal/fragment'
import { createGuid } from '../internal/guid'
import { getFragmentNodes, setElementKey } from '../internal/symbols'
import { findFirstElement, findLastElement } from '../internal/traversal'
import { AnyElement } from '../internal/types'
import { UnresolvedChild } from '../jsx-dom/resolveChildren'
import { morphFragment } from '../morphdom/morphFragment'
import { JSX } from '../types/jsx'
import { useState } from './useState'

/**
 * Takes the value of a component prop that contains JSX children of any kind
 * and returns a {@link ChildrenFragment} with children materialized as  DOM
 * nodes. Since JSX elements passed as children or “element props” are not
 * always materialized by default, this hook is useful when you need a reference
 * to actual DOM nodes.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function useChildren(
  element: JSX.ElementProp,
  deps?: readonly any[]
): ChildrenFragment

export function useChildren(
  elements: JSX.ElementsProp,
  deps?: readonly any[]
): ChildrenFragment

export function useChildren(
  children: JSX.ChildrenProp,
  deps?: readonly any[]
): ChildrenFragment

export function useChildren(
  children: UnresolvedChild,
  deps?: readonly any[]
): ChildrenFragment {
  const hook = useState(UseChildren, deps)
  return hook.update(children, deps) as any
}

class UseChildren {
  key = createGuid()
  fragment: DocumentFragment | null = null

  constructor(public deps: readonly any[] | undefined) {}

  get [kAlienNodeType]() {
    return kChildrenNodeType
  }

  update(children: UnresolvedChild, deps: readonly any[] = [children]) {
    if (depsHaveChanged(deps, this.deps)) {
      if (this.fragment) {
        morphFragment(this.fragment, wrapWithFragment(children, true))
      } else {
        this.fragment = wrapWithFragment(children, false)
        setElementKey(this.fragment, this.key)
      }
      this.deps = deps
    }
    return this
  }

  get firstChild() {
    return getFragmentNodes(this.fragment!)![0]
  }

  get firstElementChild() {
    return findFirstElement(this.firstChild, this.lastChild)
  }

  get lastChild() {
    return endOfFragment(this.fragment!)!
  }

  get lastElementChild() {
    return findLastElement(this.lastChild, this.firstChild)
  }

  get childNodes() {
    return fragmentToChildNodes(this.fragment!)
  }

  expectSingleElement() {
    const element = this.expectSingleElementOrNull()
    if (!element) {
      throw Error('Expected a single element, but found none.')
    }
    return element
  }

  expectSingleElementOrNull() {
    const { firstElementChild } = this
    if (!firstElementChild) {
      return null
    }
    const { lastChild } = this
    const { nextElementSibling } = firstElementChild
    if (
      nextElementSibling &&
      (nextElementSibling === lastChild ||
        nextElementSibling.compareDocumentPosition(lastChild) &
          Node.DOCUMENT_POSITION_FOLLOWING)
    ) {
      throw Error('Expected a single element, but found multiple.')
    }
    return firstElementChild
  }

  forEachElement<This = typeof globalThis>(
    callback: (this: This, element: AnyElement, index: number) => void,
    context?: This
  ) {
    let { firstElementChild: element, lastElementChild } = this
    let index = -1
    while (element) {
      callback.call(context!, element, ++index)
      if (element === lastElementChild) {
        return
      }
      element = element.nextElementSibling
    }
  }

  toElements() {
    return fragmentToChildNodes(
      this.fragment!,
      (child): child is Element =>
        !!child && child.nodeType === kElementNodeType
    )
  }
}

/**
 * Returns true if the given value is the result of a `useChildren` call.
 */
export function isChildrenFragment(value: any): value is ChildrenFragment {
  return Boolean(value) && value[kAlienNodeType] === kChildrenNodeType
}

/**
 * The result of a `useChildren` call. It wraps around a `DocumentFragment` and
 * provides convenience methods for working with the child nodes. It can be
 * passed as a child of a JSX element or returned from a component.
 */
export interface ChildrenFragment {
  get fragment(): DocumentFragment
  get firstChild(): Comment
  get firstElementChild(): JSX.Element | null
  get lastChild(): ChildNode
  get lastElementChild(): JSX.Element | null
  /**
   * The returned array is not live, so it won't update if the fragment changes.
   */
  get childNodes(): ChildNode[]
  /**
   * The returned array is not live, so it won't update if the fragment changes.
   */
  toElements(): JSX.Element[]
  /**
   * Throw an error if the fragment is not a single element, otherwise return
   * the single element.
   */
  expectSingleElement(): JSX.Element
  /**
   * Return the single element in the fragment, or `null` if there are no
   * elements. Throw an error if there are multiple elements.
   */
  expectSingleElementOrNull(): JSX.Element | null
  /**
   * Call the given callback for each element in the fragment, with the element
   * and its index as arguments.
   */
  forEachElement<This = typeof globalThis>(
    callback: (this: This, element: JSX.Element, index: number) => void,
    context?: This
  ): void
}
