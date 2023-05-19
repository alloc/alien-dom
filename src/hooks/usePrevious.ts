import { useState } from './useState'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { noop } from '../jsx-dom/util'

export function usePrevious<T>(value: T): T | undefined
export function usePrevious<T>(value: T, deps: readonly any[]): T | undefined
export function usePrevious(value: any, deps?: readonly any[]) {
  const state = useState(initialState, deps)

  const { prev } = state
  state.prev = value

  if (deps && depsHaveChanged(deps, state.deps!)) {
    state.deps = deps
    return undefined
  }
  return prev
}

const initialState = (
  deps: readonly any[] | undefined
): {
  deps: readonly any[] | undefined
  prev: any
  dispose: (() => void) | void
} => ({
  deps,
  prev: undefined,
  // This is defined so HMR knows to clear the usePrevious cache.
  dispose: deps ? noop : undefined,
})
