import type { JSX } from './types/jsx'
import { Fragment } from './jsx-dom/jsx-runtime'
import { ref, Ref } from './signals'
import { currentComponent } from './global'

export type AlienContext<T = any> = {
  (props: { value: T; children: JSX.Children }): JSX.Element
  get(): T
}

export type AlienForwardedContext = {
  (props: { children: JSX.Children }): JSX.Element
  get(): ContextStore
  forward<Args extends any[], Result>(
    fn: (...args: Args) => Result,
    ...args: Args
  ): Result
}

/** @internal */
export const currentContext = new Map<AlienContext, Ref<any>>()

export class ContextStore extends Map<AlienContext, Ref<any>> {}

export function createContext<T>(context: ContextStore): AlienForwardedContext
export function createContext<T>(initial: T): AlienContext<T>
export function createContext<T>(): AlienContext<T | undefined>
export function createContext<T>(initial?: T) {
  const isForwardedContext = initial instanceof ContextStore

  function Provider({
    value,
    children,
  }: {
    value?: T
    children: JSX.Children
  }) {
    if (children) {
      let oldValues: Map<AlienContext, Ref<any>> | undefined
      let oldValue: Ref<any> | undefined
      if (isForwardedContext) {
        oldValues = new Map(currentContext)
        initial.forEach((value, key) => {
          currentContext.set(key, value)
        })
      } else {
        oldValue = currentContext.get(Provider)
        currentContext.set(Provider, ref(value))
      }
      try {
        return Fragment({ children }) as any
      } finally {
        if (isForwardedContext) {
          initial.forEach((_, key) => {
            const oldValue = oldValues!.get(key)
            if (oldValue) {
              currentContext.set(key, oldValue)
            } else {
              currentContext.delete(key)
            }
          })
        } else if (oldValue !== undefined) {
          currentContext.set(Provider, oldValue)
        } else {
          currentContext.delete(Provider)
        }
      }
    }
    return null
  }

  Provider.get = (): T => {
    if (isForwardedContext) {
      return initial!
    }
    const component = currentComponent.get()
    const current = component
      ? component.context.get(Provider)
      : currentContext.get(Provider)
    if (current) {
      return current.value
    }
    return initial!
  }

  if (isForwardedContext) {
    Provider.forward = (fn: any, ...args: any[]) => {
      const oldValues = new Map(currentContext)
      initial.forEach((value, key) => {
        currentContext.set(key, value)
      })
      try {
        return fn(...args)
      } finally {
        initial.forEach((_, key) => {
          const oldValue = oldValues.get(key)
          if (oldValue) {
            currentContext.set(key, oldValue)
          } else {
            currentContext.delete(key)
          }
        })
      }
    }
  }

  return Provider
}
