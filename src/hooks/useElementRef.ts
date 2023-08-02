import { AlienEffectType, defineEffectType } from '../effects'
import { EffectResult } from './useEffect'
import { useState } from './useState'

export type ElementRef<T extends Element = Element> = T & {
  toElement(): T | null
  setElement(element: T | null): void
  onceElementExists: AlienEffectType<[effect: (element: T) => EffectResult]>
}

export function useElementRef<T extends Element>(
  effect?: (element: T) => EffectResult
) {
  return useState(createElementRef<T>, effect)
}

const kElementType = Symbol.for('ElementRef')

export const isElementRef: {
  <T extends Element>(arg: T): arg is ElementRef<T>
  <T extends Element = Element>(arg: any): arg is ElementRef<T>
} = (arg): arg is ElementRef => !!(arg && arg[kElementType])

export function createElementRef<T extends Element>(
  effect?: (element: T) => EffectResult
): ElementRef<T> {
  let element: T | null = null
  let effectResult: EffectResult | undefined
  let pendingEffects = new Set<(element: T) => void>()

  const onceElementExists = defineEffectType(
    (effect: (element: T) => EffectResult) => {
      let dispose: EffectResult | undefined
      if (element) {
        return effect(element)
      }
      const pendingEffect = (element: T) => {
        dispose = effect(element)
      }
      pendingEffects.add(pendingEffect)
      return () => {
        pendingEffects.delete(pendingEffect)
        dispose?.()
      }
    }
  )

  return new Proxy(
    {
      toElement() {
        return element
      },
      setElement(newElement: T | null) {
        element = newElement
        if (effectResult) {
          effectResult()
          effectResult = undefined
        }
        if (element) {
          effectResult = effect?.(element)
          for (const pendingEffect of pendingEffects) {
            pendingEffect(element)
          }
          pendingEffects.clear()
        }
      },
      onceElementExists,
    } as ElementRef<T>,
    {
      get(target, prop) {
        if (prop === kElementType) {
          return true
        }
        if (element && prop in element) {
          const value = (element as any)[prop]
          return typeof value === 'function' ? value.bind(element) : value
        }
        return (target as any)[prop]
      },
      set(target, prop, value) {
        if (element && prop in element) {
          return Reflect.set(element, prop, value)
        }
        return Reflect.set(target, prop, value)
      },
    }
  )
}
