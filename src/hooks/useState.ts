import { currentComponent } from '../global'

export function useState<State extends object, Params extends any[]>(
  init: (...params: Params) => State,
  ...params: Params
): State

export function useState<State extends object, Params extends any[]>(
  init: new (...args: Params) => State,
  ...params: Params
): State

export function useState(init: StateInitializer, ...params: any[]) {
  const component = currentComponent.get()!
  const index = component.memoryIndex++
  return (component.memory[index] ||= isClass(init)
    ? new init(...params)
    : init(...params))
}

type StateInitializer =
  | ((...params: any[]) => object)
  | (new (...args: any[]) => object)

function isClass(arg: StateInitializer): arg is new (...args: any[]) => any {
  return arg.toString().startsWith('class ')
}
