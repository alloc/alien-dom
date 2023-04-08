import { Ref, ref } from '../signals'
import { currentComponent } from '../global'

export function useRef<T>(init: T | (() => T)): Ref<T> {
  const component = currentComponent.get()!
  const index = component.memoryIndex++
  return (component.memory[index] ||= ref(
    init instanceof Function ? init() : init
  ))
}
