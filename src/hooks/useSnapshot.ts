import { isFunction } from '@alloc/is'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { noop } from '../jsx-dom/util'
import { peek } from '../observable'
import { useState } from './useState'

export function useSnapshot<T>(
  arg: T | (() => T),
  deps: readonly any[] = []
): T {
  const state = useState(initialState, deps)
  if (depsHaveChanged(deps, state.deps)) {
    state.value = isFunction(arg) ? peek(arg) : arg
    state.deps = deps
  }
  return state.value
}

const initialState = (
  deps: readonly any[]
): {
  deps: readonly any[]
  value: any
  dispose: () => void
} => ({
  deps,
  value: undefined,
  dispose: noop,
})
