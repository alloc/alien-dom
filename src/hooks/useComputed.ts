import { ComputedRef, computed } from '../core/observable'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { DisposableHook, useConstructor } from './useConstructor'

/**
 * Creates a `ComputedRef` that is updated when the dependencies change.
 *
 * Like `useMemo`, the ref is recreated when the component is hot reloaded.
 *
 * 🪝 This hook adds 2 to the hook offset.
 */
export function useComputed<T>(
  get: () => T,
  deps: readonly any[] = [],
  debugId?: string | number
): ComputedRef<T> & [value: T] {
  const state = useConstructor(UseComputed)
  if (depsHaveChanged(deps, state.deps)) {
    state.ref = computed(get, debugId)
    state.deps = deps
  }
  return state.ref as any
}

class UseComputed implements DisposableHook {
  ref?: ComputedRef = undefined
  deps?: readonly any[] = undefined
  dispose = true
}
