import { isFunction } from '@alloc/is'
import { peek } from '../core/observable'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { DisposableHook, useConstructor } from './internal/useConstructor'

/**
 * Save a value until its dependencies change. If a function is passed, it‘s
 * called with `peek()` and its result is saved as the value.
 *
 * The value is discarded when the component is hot-reloaded.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function useMemo<T>(arg: T | (() => T), deps: readonly any[] = []): T {
  const state = useConstructor(UseMemo)
  if (depsHaveChanged(deps, state.deps)) {
    state.value = isFunction(arg) ? peek(arg) : arg
    state.deps = deps
  }
  return state.value
}

class UseMemo implements DisposableHook {
  value: any = undefined
  deps?: readonly any[] = undefined
  dispose = true
}
