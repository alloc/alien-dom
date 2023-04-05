import { currentComponent } from '../global'

export function useState<State extends object, Params extends any[]>(
  init: (...params: Params) => State,
  ...params: Params
): State {
  const scope = currentComponent.get()!
  const index = scope.memoryIndex++
  return (scope.memory[index] ||= init(...params))
}
