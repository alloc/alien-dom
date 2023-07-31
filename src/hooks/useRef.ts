import { currentComponent } from '../internal/global'
import { Ref, ref } from '../observable'
import { useMemo } from './useMemo'

export function useRef<T>(): Ref<T | undefined> &
  [value: T | undefined, set: Ref<T | undefined>[1]]

export function useRef<T>(
  init: T | (() => T)
): Ref<T> & [value: T, set: Ref<T>[1]]

export function useRef<T>(
  init: T | (() => T),
  deps: readonly any[]
): Ref<T> & [value: T, set: Ref<T>[1]]

export function useRef<T>(
  init?: T | (() => T),
  deps?: readonly any[]
): Ref<any> {
  const component = currentComponent.get()!
  const index = component.nextHookIndex++
  if (deps) {
    useMemo(() => {
      component.hooks[index] = null
    }, deps)
  }
  return (component.hooks[index] ||= ref(
    init instanceof Function ? init() : init
  ))
}
