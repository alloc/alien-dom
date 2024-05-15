import { Context, defineContext, ForwardedContext } from '../core/context'
import { expectCurrentComponent } from '../internal/global'
import { kAlienInitialContext } from '../internal/symbols'

/**
 * Capture the current context and return a Provider component that can
 * forward it to other components asynchronously.
 */
export function useContext(): ForwardedContext

/**
 * Access the current value of the given Context type.
 */
export function useContext<T>(context: Context<T>): T

export function useContext(context?: Context): ForwardedContext {
  const component = expectCurrentComponent()
  if (context) {
    const current = component.context.get(context)
    return current ? current.value : kAlienInitialContext(context)
  }
  const index = component.nextHookIndex++
  return (component.hooks[index] ||= defineContext(component.context))
}
