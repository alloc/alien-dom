import { forwardContext, getContext, setContext } from './internal/context'
import { currentComponent } from './internal/global'
import { kAlienStateless } from './internal/symbols'
import { lastValue } from './internal/util'
import { Fragment } from './jsx-dom/jsx-runtime'
import { Ref, ref } from './observable'
import type { JSX } from './types/jsx'

export type AlienContext<T = any> = {
  (props: { value: T; children: JSX.ChildrenProp }): JSX.Element
  get(): T
  with(value: T): [AlienContext<T>, Ref<T>]
}

export type AlienForwardedContext = {
  (props: { children: JSX.ChildrenProp }): JSX.Element
  get(): ContextStore
  forward<Args extends any[], Result>(
    fn: (...args: Args) => Result,
    ...args: Args
  ): Result
}

export class ContextStore extends Map<AlienContext, Ref> {
  get Provider() {
    return createContext(this)
  }
  declare get: <T>(key: AlienContext<T>) => Ref<T> | undefined
  declare set: <T>(key: AlienContext<T>, value: Ref<T>) => this
}

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
    children: JSX.ChildrenProp
  }) {
    if (children) {
      let restoreContext: (() => void) | undefined
      let oldValue: Ref | undefined

      if (isForwardedContext) {
        restoreContext = forwardContext(initial)
      } else {
        oldValue = setContext(Provider as any, ref(value))
      }

      try {
        return Fragment({ children }) as any
      } finally {
        if (isForwardedContext) {
          restoreContext!()
        } else {
          setContext(Provider as any, oldValue)
        }
      }
    }
    return null
  }

  kAlienStateless(Provider, true)

  Provider.get = (): T => {
    if (isForwardedContext) {
      return initial!
    }

    const component = lastValue(currentComponent)
    const current = component
      ? component.context.get<T>(Provider as any)
      : getContext<T>(Provider as any)

    if (current) {
      return current.value
    }
    return initial!
  }

  if (isForwardedContext) {
    Provider.forward = (fn: any, ...args: any[]) => {
      const oldValues = new Map(getContext())
      initial.forEach((value, key) => {
        setContext(key, value)
      })
      try {
        return fn(...args)
      } finally {
        initial.forEach((_, key) => {
          setContext(key, oldValues.get(key))
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
