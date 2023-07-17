import { EffectResult } from './useEffect'
import { useState } from './useState'

export type ElementRef<T extends Element = Element> = T & {
  toElement(): T | null
  setElement(element: T | null): void
}

export function useElementRef<T extends Element>(
  effect?: (element: T) => EffectResult
) {
  return useState(createElementRef<T>, effect)
}

const kElementType = Symbol.for('ElementRef')

export const isElementRef = <T extends Element = Element>(
  arg: any
): arg is ElementRef<T> => !!(arg && arg[kElementType])

export function createElementRef<T extends Element>(
  effect?: (element: T) => EffectResult
): ElementRef<T> {
  let element: T | null = null
  let effectResult: EffectResult | undefined

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
        if (element && effect) {
          effectResult = effect(element)
        }
      },
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
