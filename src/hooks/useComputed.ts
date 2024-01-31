import { depsHaveChanged } from '../functions/depsHaveChanged'
import { noop } from '../jsx-dom/util'
import { ComputedRef, computed } from '../observable'
import { useState } from './useState'

/**
 * Creates a `ComputedRef` that is updated when the dependencies change.
 */
export function useComputed<T>(
  get: () => T,
  deps: readonly any[] = [],
  debugId?: string | number
): ComputedRef<T> {
  const state = useState(initialState, deps)
  if (depsHaveChanged(deps, state.deps)) {
    state.ref = computed(get, debugId)
    state.deps = deps
  }
  return state.ref!
}

const initialState = (
  deps: readonly any[]
): {
  deps: readonly any[]
  ref: ComputedRef | null
  dispose: (() => void) | void
} => ({
  deps,
  ref: null,
  // This is defined so HMR knows to rerun the ComputedRef.
  dispose: noop,
})
