import { currentComponent } from '../global'

export function useState<State extends object, Params extends any[]>(
  init: (...params: Params) => State,
  ...params: Params
): State {
  const component = currentComponent.get()!
  const index = component.memoryIndex++
  return (component.memory[index] ||= init(...params))
}
