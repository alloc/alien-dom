import { depsHaveChanged } from '../functions/depsHaveChanged'
import { currentComponent } from '../internal/global'

export function useDepsArray(deps: readonly any[]) {
  const component = currentComponent.get()!
  const index = component.nextHookIndex++
  const lastDeps = component.hooks[index]
  if (depsHaveChanged(deps, lastDeps)) {
    component.hooks[index] = deps
    return true
  }
  return false
}
