import { expectCurrentComponent } from '../internal/global'

/**
 * Create a function that forces the current component to rerender.
 */
export function useForceUpdate() {
  const component = expectCurrentComponent()
  const index = component.nextHookIndex++
  return (component.hooks[index] ||= component.update.bind(component))
}
