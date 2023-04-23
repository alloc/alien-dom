import { useMicrotask } from './useMicrotask'
import { useState } from './useState'

export function useEffect(
  effect: () => (() => void) | void,
  deps: readonly any[]
) {
  const state = useState(initialState, deps)
  const prevDeps = state.deps
  const shouldRun =
    deps === prevDeps ||
    deps.length !== prevDeps.length ||
    deps.some((dep, i) => dep !== prevDeps[i])

  useMicrotask(() => {
    state.dispose?.()
    state.deps = deps
    state.dispose = effect()
  }, shouldRun)
}

type State = {
  deps: readonly any[]
  dispose: (() => void) | void
}

function initialState(deps: readonly any[]): State {
  return { deps, dispose: undefined }
}
