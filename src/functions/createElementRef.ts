import { Disposable } from '../disposable'
import { defineEffectType } from '../effects'
import type { EffectResult } from '../hooks/useEffect'

export type ElementRef<T extends Element = Element> = T & {
  toElement(): T | null
  setElement(element: T | null): void
  onceElementExists(effect: (element: T) => EffectResult): Disposable
}

export function createElementRef<T extends Element>(
  effect?: (element: T) => EffectResult
): ElementRef<T> {
  const ref = new InternalElementRef<T>(effect)
  return new Proxy(ref as any, {
    get(target, prop) {
      if (prop === kElementType) {
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

const kElementType = Symbol.for('ElementRef')

export const isElementRef: {
  <T extends Element>(arg: T): arg is ElementRef<T>
  <T extends Element = Element>(arg: any): arg is ElementRef<T>
} = (arg): arg is ElementRef<Element> => !!(arg && arg[kElementType])

class InternalElementRef<T extends Element = any> {
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

  get [kElementType]() {
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
  (ref: InternalElementRef<any>, effect: (element: any) => EffectResult) => {
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
