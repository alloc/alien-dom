import { isFunction } from '@alloc/is'
import { peek } from '../core/observable'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { useConst } from './useConst'

/**
 * Save a value until its dependencies change. If a function is passed, it‘s
 * called with `peek()` and its result is saved as the value.
 *
 * The value is discarded when the component is hot-reloaded.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function useMemo<T>(arg: T | (() => T), deps: readonly any[] = []): T {
  const state = useConst(UseMemo, deps)
  if (depsHaveChanged(deps, state.deps)) {
    state.value = isFunction(arg) ? peek(arg) : arg
    state.deps = deps
  }
  return state.value
}

class UseMemo {
  constructor(public deps: readonly any[]) {}
  value: any = undefined
  // This tells the runtime to reset the state after an HMR update.
  dispose = true
}
