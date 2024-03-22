import { peek } from '../core/observable'
import { expectCurrentComponent } from '../internal/global'

/**
 * Create a piece of state that persists between renders. It won't be lost when
 * the component hot reloads. The state is initialized only once, when the
 * component is mounted.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function useState<State extends object, Params extends any[]>(
  init: new (...args: Params) => State,
  ...params: Params
): State

export function useState<State extends object, Params extends any[]>(
  init: (...params: Params) => State,
  ...params: Params
): State

export function useState(init: StateInitializer, ...params: any[]) {
  const component = expectCurrentComponent()
  const index = component.nextHookIndex++
  return (component.hooks[index] ||= peek(createState, init, params))
}

type StateInitializer =
  | ((...params: any[]) => object)
  | (new (...args: any[]) => object)

function createState(init: StateInitializer, params: any[]) {
  return isClass(init) ? new init(...params) : init(...params)
}

function isClass(arg: StateInitializer): arg is new (...args: any[]) => any {
  return /^(class[ {]|function [A-Z])/.test(arg.toString())
}
