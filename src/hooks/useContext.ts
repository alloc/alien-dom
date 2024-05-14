import { ContextStore, createContext, ForwardedContext } from '../core/context'
import { getContext } from '../internal/context'
import { currentComponent } from '../internal/global'
import { lastValue } from '../internal/util'

/**
 * Capture the current context and return a Provider component that can
 * forward it to other components asynchronously.
 */
export function useContext(): ForwardedContext {
  const component = lastValue(currentComponent)
  if (component) {
    const index = component.nextHookIndex++
    return (component.hooks[index] ||= createContext(component.context))
  }
  return createContext(new ContextStore(getContext()))
}
