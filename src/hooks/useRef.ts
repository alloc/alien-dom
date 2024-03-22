import { Ref, ref } from '../core/observable'
import { expectCurrentComponent } from '../internal/global'
import { useDepsArray } from './useDepsArray'

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
  const component = expectCurrentComponent()
  const index = component.nextHookIndex++
  if (useDepsArray(deps)) {
    component.hooks[index] = null
  }
  return (component.hooks[index] ||= ref(
    init instanceof Function ? init() : init
  ))
}
