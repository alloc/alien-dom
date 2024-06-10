import { Disposable } from '../core/disposable'
import type { EffectResult } from '../hooks/useEffect'
import {
  InternalElementProxy,
  kElementProxyType,
} from '../internal/elementProxy'

export type ElementProxy<T extends Element = Element> = T & {
  toElement(): T | null
  onceElementExists(effect: (element: T) => EffectResult): Disposable
  setElement(element: T | null): void
}

/** Coerce an `ElementProxy` to its original `Element` type. */
export type FromElementProxy<T> = T extends ElementProxy<infer U>
  ? U
  : Extract<T, Element>

export function createElementProxy<T extends Element>(
  effect?: (element: T) => EffectResult
): ElementProxy<T> {
  const ref = new InternalElementProxy<T>(effect)
  return new Proxy(ref as any, {
    get(target, prop) {
      if (prop === kElementProxyType) {
        return true
      }
      if (ref._element && prop in ref._element) {
        const value = (ref._element as any)[prop]
        return typeof value === 'function' ? value.bind(ref._element) : value
      }
      return target[prop]
    },
    set(target, prop, value) {
      if (ref._element && prop in ref._element) {
        target = ref._element
      }
      return Reflect.set(target, prop, value)
    },
  })
}

export const isElementProxy: {
  <T extends Element>(arg: T): arg is ElementProxy<T>
  <T extends Element = Element>(arg: any): arg is ElementProxy<T>
} = (arg): arg is ElementProxy<Element> => !!(arg && arg[kElementProxyType])
