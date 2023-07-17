import { useState } from './useState'

export type ElementRef<T extends Element> = T & {
  setElement(element: T): void
  toElement(): T | null
}

export function useElementRef<T extends Element>() {
  return useState(createElementRef<T>)
}

export function createElementRef<T extends Element>(): ElementRef<T> {
  let element: T | null = null
  return new Proxy(
    {
      toElement() {
        return element
      },
      setElement(newElement: T) {
        element = newElement
      },
    } as ElementRef<T>,
    {
      get(target, prop) {
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
