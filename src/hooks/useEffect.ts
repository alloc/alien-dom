import { useMicrotask } from './useMicrotask'
import { useState } from './useState'
import { depsHaveChanged } from '../functions/depsHaveChanged'

export type EffectCallback = () => (() => void) | void

export function useEffect(effect: EffectCallback, deps: readonly any[]) {
  const state = useState(initialState, deps)
  useMicrotask(() => {
    state.dispose?.()
    state.deps = deps
    state.dispose = effect()
  }, depsHaveChanged(deps, state.deps))
}

const initialState = (
  deps: readonly any[]
): {
  deps: readonly any[]
  dispose: (() => void) | void
} => ({
  deps,
  dispose: undefined,
})
