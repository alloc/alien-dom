import { depsHaveChanged } from '../functions/depsHaveChanged'
import { expectCurrentComponent } from '../internal/global'

export function useDepsArray(deps: readonly any[] | undefined) {
  const component = expectCurrentComponent()
  const index = component.nextHookIndex++
  if (deps) {
    const lastDeps = component.hooks[index]
    if (depsHaveChanged(deps, lastDeps)) {
      component.hooks[index] = deps
      return true
    }
  }
  return false
}
