import { depsHaveChanged } from '../functions/depsHaveChanged'
import { useMicrotask } from './useMicrotask'
import { useState } from './useState'

export type EffectResult = (() => void) | void
export type EffectCallback = () => EffectResult

export function useEffect(effect: EffectCallback, deps: readonly any[]) {
  const state = useState(UseEffect, deps)
  useMicrotask(() => {
    state.dispose?.()
    state.deps = deps
    state.dispose = effect()
  }, depsHaveChanged(deps, state.deps))
}

class UseEffect {
  constructor(public deps: readonly any[]) {}
  dispose: (() => void) | void = undefined
}
