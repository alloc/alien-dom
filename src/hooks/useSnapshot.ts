import { isFunction } from '@alloc/is'
import { peek } from '../core/observable'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { useState } from './useState'

/**
 * Similar to `useMemo` except the callback is wrapped with `peek()` to ensure
 * observable access is disabled (i.e. not observed by the current component).
 * This ensures the snapshot's value is only updated when the `deps` change.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
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
