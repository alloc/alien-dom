import { depsHaveChanged } from '../functions/depsHaveChanged'
import { expectCurrentComponent } from '../internal/global'

/**
 * Returns the result of `depsHaveChanged` with the current `deps` and the
 * previous `deps` from the last successful render.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function useDepsArray(deps: readonly any[] | undefined) {
  const component = expectCurrentComponent()
  const index = component.nextHookIndex++

  const prevDeps = component.hooks[index]
  component.hooks[index] = deps

  return depsHaveChanged(deps, prevDeps)
}
