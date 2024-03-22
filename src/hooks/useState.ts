import { expectCurrentComponent } from '../internal/global'
import { peek } from '../observable'

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
