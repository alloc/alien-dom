import { depsHaveChanged } from '../functions/depsHaveChanged'
import { noop } from '../internal/util'
import { useConst } from './useConst'

/**
 * Save the given `value` for the next render.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function usePrevious<T>(value: T): T | undefined
export function usePrevious<T>(value: T, deps: readonly any[]): T | undefined
export function usePrevious(value: any, deps?: readonly any[]) {
  const state = useConst(UsePrevious, deps)

  const { prev } = state
  state.prev = value

  if (deps && depsHaveChanged(deps, state.deps)) {
    state.deps = deps
    return undefined
  }
  return prev
}

class UsePrevious {
  constructor(public deps: readonly any[] | undefined) {
    // This is defined so HMR knows to clear the usePrevious cache.
    this.dispose = deps ? noop : undefined
  }
  prev: any = undefined
  dispose: (() => void) | void
}
