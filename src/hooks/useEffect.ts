import { depsHaveChanged } from '../functions/depsHaveChanged'
import { useMicrotask } from './useMicrotask'
import { useState } from './useState'

export type EffectResult = (() => void) | void
export type EffectCallback = () => EffectResult

/**
 * Run an effect after the component is mounted. The effect may rerun on a rerender
 * if the dependencies have changed. The effect is disposed before the next run.
 *
 * 🪝 This hook adds 2 to the hook offset.
 */
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
