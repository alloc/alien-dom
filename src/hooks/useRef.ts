import { Ref, ref } from '../signals'
import { currentComponent } from '../global'

export function useRef<T>(init: T | (() => T)): Ref<T> {
  const scope = currentComponent.get()!
  const index = scope.memoryIndex++
  return (scope.memory[index] ||= ref(init instanceof Function ? init() : init))
}
