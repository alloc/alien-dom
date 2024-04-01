import { depsHaveChanged } from '../functions/depsHaveChanged'
import { wrapWithFragment } from '../internal/fragment'
import { createGuid } from '../internal/guid'
import { kAlienElementKey } from '../internal/symbols'
import { morphFragment } from '../morphdom/morphFragment'
import { useState } from './useState'

/**
 * Ensure any JSX elements in the given value are resolved and materialized.
 *
 * Note that you **must** include the returned array in the JSX tree returned by
 * your component. The returned elements cannot be separated from each other.
 * Note that the first element in the array is always a comment node.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function useChildren(
  element: JSX.ElementProp,
  deps?: readonly any[]
): DocumentFragment

export function useChildren(
  elements: JSX.ElementsProp,
  deps?: readonly any[]
): DocumentFragment

export function useChildren(
  children: JSX.ChildrenProp,
  deps?: readonly any[]
): DocumentFragment

export function useChildren(children: JSX.ChildrenProp, deps?: readonly any[]) {
  const hook = useState(UseChildren, deps)
  return hook.update(children, deps)
}

class UseChildren {
  key = createGuid()
  fragment: DocumentFragment | null = null

  constructor(public deps: readonly any[] | undefined) {}

  update(children: JSX.ChildrenProp, deps: readonly any[] = [children]) {
    if (depsHaveChanged(deps, this.deps)) {
      if (this.fragment) {
        morphFragment(this.fragment, wrapWithFragment(children, true))
      } else {
        this.fragment = wrapWithFragment(children)
        kAlienElementKey(this.fragment, this.key)
      }
      this.deps = deps
    }
    return this.fragment
  }
}
