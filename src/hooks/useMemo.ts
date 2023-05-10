import { useState } from './useState'
import { computed, ReadonlyRef } from '../signals'
import { depsHaveChanged } from '../internal/deps'
import { noop } from '../jsx-dom/util'

export function useMemo<T>(get: () => T, deps: readonly any[]): T {
  const state = useState(initialState, deps)
  if (depsHaveChanged(deps, state.deps)) {
    state.ref = computed(get)
    state.deps = deps
  }
  return state.ref!.value
}

const initialState = (
  deps: readonly any[]
): {
  deps: readonly any[]
  ref: ReadonlyRef | null
  dispose: (() => void) | void
} => ({
  deps,
  ref: null,
  // This is defined so HMR knows to clear the useMemo cache.
  dispose: noop,
})
