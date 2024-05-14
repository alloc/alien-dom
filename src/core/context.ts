import { createFragment } from '../components/Fragment'
import { useRef } from '../hooks'
import { forwardContext, getContext, setContext } from '../internal/context'
import { currentComponent } from '../internal/global'
import { lastValue } from '../internal/util'
import type { JSX } from '../types/jsx'
import { Ref, ref } from './observable'

export type Context<T = any> = {
  (props: { value: T; children: JSX.ChildrenProp }): JSX.Element
  with(value: T): [Context<T>, Ref<T>]
}

export type ForwardedContext = {
  (props: { children: JSX.ChildrenProp }): JSX.Element
  forward<Args extends any[], Result>(
    fn: (...args: Args) => Result,
    ...args: Args
  ): Result
}

export class ContextStore extends Map<Context, Ref> {
  get Provider() {
    return createContext(this)
  }
  declare get: <T>(key: Context<T>) => Ref<T> | undefined
  declare set: <T>(key: Context<T>, value: Ref<T>) => this
}

export function createContext(context: ContextStore): ForwardedContext
export function createContext<T>(initial: T): Context<T>
export function createContext<T>(): Context<T | undefined>
export function createContext<T>(initial?: T) {
  const isForwardedContext = initial instanceof ContextStore

  function Context({
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
        const ref = useRef(undefined as T | undefined)
        oldValue = setContext(Context as any, ref)
        ref.value = value
      }

      try {
        return createFragment(children) as any
      } finally {
        if (isForwardedContext) {
          restoreContext!()
        } else {
          setContext(Context as any, oldValue)
        }
      }
    }
    return null
  }

  Object.defineProperty(Context, 'value', {
    get: (): T => {
      if (isForwardedContext) {
        return initial!
      }

      const component = lastValue(currentComponent)
      const current = component
        ? component.context.get<T>(Context as any)
        : getContext<T>(Context as any)

      if (current) {
        return current.value
      }
      return initial!
    },
  })

  if (isForwardedContext) {
    Context.forward = (fn: any, ...args: any[]) => {
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
    Context.with = withProvider
  }

  return Context as any
}

function withProvider<T>(this: Context<T>, value: T) {
  return [this, ref(value)]
}
