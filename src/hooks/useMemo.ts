import { useState } from './useState'
import { computed, ReadonlyRef } from '../signals'

export function useMemo<T>(get: () => T, deps: readonly any[]) {
  const state = useState(initialState, deps)
  const prevDeps = state.deps
  const shouldRun =
    deps == prevDeps ||
    deps.length != prevDeps.length ||
    deps.some((dep, i) => dep !== prevDeps[i])

  if (shouldRun) {
    state.ref = computed(get)
  }
  return state.ref!.value
}

type State = {
  deps: readonly any[]
  ref: ReadonlyRef | null
}

function initialState(deps: readonly any[]): State {
  return { deps, ref: null }
}
