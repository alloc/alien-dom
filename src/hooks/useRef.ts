import { currentComponent } from '../internal/global'
import { Ref, ref } from '../observable'

export function useRef<T>(
  init: T | (() => T)
): Ref<T> & [value: T, set: Ref<T>[1]] {
  const component = currentComponent.get()!
  const index = component.nextHookIndex++
  return (component.hooks[index] ||= ref(
    init instanceof Function ? init() : init
  )) as any
}
