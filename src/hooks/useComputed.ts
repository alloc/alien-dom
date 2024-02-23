import { depsHaveChanged } from '../functions/depsHaveChanged'
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
  dispose: true
} => ({
  deps,
  ref: null,
  // This tells the runtime to reset the state after an HMR update.
  dispose: true,
})
