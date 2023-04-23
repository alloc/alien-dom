import { useState } from './useState'
import { computed, ReadonlyRef } from '../signals'
import { depsHaveChanged } from '../internal/deps'

export function useMemo<T>(get: () => T, deps: readonly any[]) {
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
} => ({
  deps,
  ref: null,
})
