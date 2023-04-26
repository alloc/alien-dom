import { Ref, ref } from '../signals'
import { currentComponent } from '../internal/global'

export function useRef<T>(
  init: T | (() => T)
): Ref<T> & [value: T, set: (newValue: T) => void] {
  const component = currentComponent.get()!
  const index = component.memoryIndex++
  return (component.memory[index] ||= ref(
    init instanceof Function ? init() : init
  )) as any
}
