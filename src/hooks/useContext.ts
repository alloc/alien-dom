import { AlienForwardedContext, ContextStore, createContext } from '../context'
import { getContext } from '../internal/context'
import { currentComponent } from '../internal/global'

/**
 * Capture the current context and return a Provider component that can
 * forward it to other components asynchronously.
 */
export function useContext(): AlienForwardedContext {
  const component = currentComponent.get()
  if (component) {
    const index = component.nextHookIndex++
    return (component.hooks[index] ||= createContext(component.context))
  }
  return createContext(new ContextStore(getContext()))
}
