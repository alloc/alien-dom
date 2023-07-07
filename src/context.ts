import type { JSX } from './types/jsx'
import { Fragment } from './jsx-dom/jsx-runtime'
import { ref, Ref } from './signals'
import { currentComponent } from './internal/global'

export type AlienContext<T = any> = {
  (props: { value: T; children: JSX.Children }): JSX.Element
  get(): T
  with(value: T): [AlienContext<T>, Ref<T>]
}

export type AlienForwardedContext = {
  (props: { children: JSX.Children }): JSX.Element
  get(): ContextStore
  forward<Args extends any[], Result>(
    fn: (...args: Args) => Result,
    ...args: Args
  ): Result
}

export class ContextStore extends Map<AlienContext, Ref<any>> {}

export function createContext(context: ContextStore): AlienForwardedContext
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
      let restoreContext: (() => void) | undefined
      let oldValue: Ref<any> | undefined

      if (isForwardedContext) {
        restoreContext = forwardContext(initial)
      } else {
        oldValue = currentContext.get(Provider as any)
        currentContext.set(Provider as any, ref(value))
      }

      try {
        return Fragment({ children }) as any
      } finally {
        if (isForwardedContext) {
          restoreContext!()
        } else if (oldValue !== undefined) {
          currentContext.set(Provider as any, oldValue)
        } else {
          currentContext.delete(Provider as any)
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
      ? component.context.get(Provider as any)
      : currentContext.get(Provider as any)
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
  } else {
    Provider.with = withProvider
  }

  return Provider as any
}

function withProvider<T>(this: AlienContext<T>, value: T) {
  return [this, ref(value)]
}

/** @internal */
export const currentContext = new Map<AlienContext, Ref<any>>()

/** @internal */
export function forwardContext(context: ContextStore, isRerender?: boolean) {
  const oldValues = new Map(currentContext)
  context.forEach((value, key) => {
    const ref = currentContext.get(key)
    if (isRerender && ref) {
      // If context exists, then we are being re-rendered by a parent,
      // so we want to allow the parent's context to take precedence
      // over the initial context.
      context.set(key, ref)
    } else {
      currentContext.set(key, value)
    }
  })
  return () => {
    context.forEach((_, key) => {
      const oldValue = oldValues.get(key)
      if (oldValue) {
        currentContext.set(key, oldValue)
      } else {
        currentContext.delete(key)
      }
    })
  }
}
