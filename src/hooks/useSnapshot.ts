import { isFunction } from '@alloc/is'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { peek } from '../observable'
import { useState } from './useState'

export function useSnapshot<T>(
  arg: T | (() => T),
  deps: readonly any[] = []
): T {
  const state = useState(UseSnapshot, deps)
  if (depsHaveChanged(deps, state.deps)) {
    state.value = isFunction(arg) ? peek(arg) : arg
    state.deps = deps
  }
  return state.value
}

class UseSnapshot {
  constructor(public deps: readonly any[]) {}
  value: any = undefined
  // This tells the runtime to reset the state after an HMR update.
  dispose = true
}
