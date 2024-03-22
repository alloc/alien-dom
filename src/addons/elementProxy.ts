import { defineEffectType } from '../core/effects'
import type { EffectResult } from '../hooks/useEffect'
import { Disposable } from './disposable'

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

const kElementProxyType = Symbol.for('ElementProxy')

export const isElementProxy: {
  <T extends Element>(arg: T): arg is ElementProxy<T>
  <T extends Element = Element>(arg: any): arg is ElementProxy<T>
} = (arg): arg is ElementProxy<Element> => !!(arg && arg[kElementProxyType])

class InternalElementProxy<T extends Element = any> {
  /** The element that was set. */
  _element: T | null = null
  /**
   * Pending effects that will be called when an element is set. They exist when
   * `onceElementExists` is called before an element has been set.
   */
  _pendingEffects: Set<(element: T) => void> | null = null

  constructor(effect?: (element: T) => EffectResult) {
    if (effect) {
      onceElementExists(this, effect)
    }
  }

  get [kElementProxyType]() {
    return true
  }

  toElement() {
    return this._element
  }

  setElement(element: T | null) {
    const pendingEffects = this._pendingEffects
    this._pendingEffects = null

    this._element = element
    if (element) {
      pendingEffects?.forEach(effect => effect(element))
    }
  }

  onceElementExists(effect: (element: T) => EffectResult) {
    return onceElementExists(this, effect)
  }

  // This must be named `dispose` for HMR to clear it on updates.
  dispose() {
    this._pendingEffects = null
  }
}

const onceElementExists = defineEffectType(
  (ref: InternalElementProxy<any>, effect: (element: any) => EffectResult) => {
    let dispose: EffectResult | undefined
    if (ref._element) {
      return effect(ref._element)
    }
    const pendingEffect = (element: any) => {
      dispose = effect(element)
    }
    const pendingEffects = (ref._pendingEffects ||= new Set())
    pendingEffects.add(pendingEffect)
    return () => {
      pendingEffects.delete(pendingEffect)
      dispose?.()
    }
  }
)
