import { currentComponent } from '../global'
import {
  currentContext,
  createContext,
  AlienForwardedContext,
  ContextStore,
} from '../context'

/**
 * Capture the current context and return a Provider component that can
 * forward it to other components asynchronously.
 */
export function useContext(): AlienForwardedContext {
  const component = currentComponent.get()
  if (component) {
    const index = component.memoryIndex++
    return (component.memory[index] ||= createContext(component.context))
  }
  return createContext(new ContextStore(currentContext))
}
