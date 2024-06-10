import { depsHaveChanged } from '../functions/depsHaveChanged'
import { useApply } from './internal/useApply'
import { useConstructor } from './internal/useConstructor'

/**
 * Save the given `value` for the next render.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function usePrevious<T>(value: T, deps?: readonly any[]): T | undefined {
  const state = useConstructor(UsePrevious)
  useApply(() => {
    state.prev = value
    state.deps = deps
  })

  if (deps && depsHaveChanged(deps, state.deps)) {
    return undefined
  }
  return state.prev
}

class UsePrevious {
  prev: any = undefined
  deps?: readonly any[] = undefined
  dispose = true
}
