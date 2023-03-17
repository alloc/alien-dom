import { signal as createSignal } from '@preact/signals-core'
import { Spread } from 'type-fest'
import { kAlienScope } from './symbols'

export interface AlienContext<T> {
  get: () => T
  find: (fn: (value: NonNullable<T>) => unknown) => T | undefined
  replace: (oldValue: T | null | undefined, value: T) => T
  push: (value: T) => T
  pop: (until?: (value: NonNullable<T>) => boolean) => T | undefined
}

export function createContext<T>(initial?: T): AlienContext<T> {
  const stack = [initial]
  return {
    get: () => stack.at(-1)!,
    find(fn) {
      for (let i = 1; i <= stack.length; ) {
        const value = stack.at(-i)!
        if (fn(value)) {
          return value
        }
      }
    },
    replace(oldValue, value) {
      const index = oldValue != null ? stack.indexOf(oldValue) : -1
      if (index != -1) {
        stack[index] = value
      } else {
        stack.push(value)
      }
      return value
    },
    push(value) {
      stack.push(value)
      return value
    },
    pop(until) {
      if (!until) {
        return stack.pop()
      }
      while (true) {
        const value = stack.pop()
        if (value == null) {
          stack.push(value)
          return
        }
        if (until(value)) {
          return value
        }
      }
    },
  }
}

export interface AlienSubscription<T = any, K = any> {
  target?: T
  key?: K
  dispose: () => void
}

export type AlienScope<State extends { element?: Element } = {}> = Spread<
  State,
  {
    element?: Element
    subscribed?: Set<AlienSubscription>
    enabled: boolean
  }
>

export function isAlienScope(scope: any): scope is AlienScope {
  return scope && kAlienScope in scope
}

declare global {
  interface ImportMeta {
    env: ImportMetaEnv
  }
  interface ImportMetaEnv {
    DEV: true
  }
}

/**
 * ⚠️ Be sure to pop the scope in the same microtask as you push it.
 */
export const currentScope = (() => {
  const context = createContext<AlienScope | null>(null)

  function push(): AlienScope
  function push<State extends object>(
    state: State & { element?: Element }
  ): AlienScope<State>
  function push<State extends object>(scope: AlienScope): AlienScope<State>
  function push(state?: object) {
    let scope: AlienScope
    if (isAlienScope(state)) {
      scope = state
    } else {
      scope = createSignalStruct({ ...state, enabled: true })
      Object.defineProperty(scope, kAlienScope, { value: true })
    }
    if (import.meta.env.DEV) {
      queueMicrotask(() => {
        if (scope.enabled) {
          console.warn(
            'Scope must be popped in same microtask, but was not:',
            scope
          )
        }
      })
    }
    return context.push(scope)
  }

  return {
    ...context,
    push,
    pop(scope: AlienScope) {
      return context.pop(s => {
        s.enabled = false
        s.subscribed?.forEach(sub => sub.dispose())
        return s == scope
      })
    },
  }
})()

export function trackSubscription(
  sub: AlienSubscription,
  context = currentScope.get()
) {
  if (!context) {
    return sub
  }
  const { dispose } = sub
  sub.dispose = () => {
    context.subscribed!.delete(sub)
    dispose()
  }
  context.subscribed ||= new Set()
  context.subscribed.add(sub)
  return sub
}

export function onDispose(dispose: () => void) {
  trackSubscription({ dispose })
}

export function createElementScope<
  State extends object = {},
  T extends Element = Element
>() {
  type ElementState = State & { element: T }
  const currentElement = createContext<Element | null>(null)
  return {
    getElement: currentElement.get,
    get() {
      const element = currentElement.get()
      if (element) {
        return currentScope.find(scope => scope.element == element) as
          | AlienScope<ElementState>
          | undefined
      }
    },
    push(element: T, state?: State): AlienScope<ElementState> {
      currentElement.push(element)
      return currentScope.push({ ...state, element }) as any
    },
    pop() {
      const element = currentElement.pop()
      if (element) {
        return currentScope.pop(
          currentScope.find(scope => scope.element == element)!
        ) as AlienScope<ElementState> | undefined
      }
    },
  }
}

function createSignalStruct<State extends object>(init: State) {
  const state = {} as State
  for (const [key, value] of Object.entries(init)) {
    const signal = createSignal(value)
    Object.defineProperty(state, key, {
      enumerable: true,
      get: Reflect.get.bind(Reflect, signal, 'value'),
      set: Reflect.set.bind(Reflect, signal, 'value'),
    })
  }
  return state
}
