import { Ref, ref } from '../signals'
import { currentComponent } from '../internal/global'

type Fn = (...args: any[]) => any

export type UseRefSetter<T> = (
  newValue: Exclude<T, Fn> | ((oldValue: T) => T)
) => void

export function useRef<T>(
  init: T | (() => T)
): Ref<T> & [value: T, set: UseRefSetter<T>] {
  const component = currentComponent.get()!
  const index = component.nextHookIndex++
  return (component.hooks[index] ||= ref(
    init instanceof Function ? init() : init
  )) as any
}
