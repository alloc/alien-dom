import type { JSX } from './types/jsx'
import { Fragment } from './jsx-dom/jsx'

export interface AlienContext<T> {
  get: () => T
  find: (fn: (value: NonNullable<T>) => unknown) => T | undefined
  replace: (oldValue: T | null | undefined, value: T) => T
  push: <U extends T>(value: U) => U
  pop: {
    (until?: (value: NonNullable<T>) => boolean): T | undefined
    (value: Exclude<T, (...args: any) => any>): void
  }
  Provider: (props: { value: T; children: JSX.Children }) => JSX.Element | null
}

export function createContext<T>(initial?: T): AlienContext<T> {
  const stack = [initial]
  function push(value: any) {
    stack.push(value)
    return value
  }
  function pop(arg?: any) {
    if (!arg) {
      return stack.pop()
    }

    const until =
      typeof arg == 'function'
        ? (arg as (value: NonNullable<T>) => boolean)
        : (value: NonNullable<T>) => value === arg

    while (stack.length) {
      const value = stack.pop()
      if (value == null) {
        if (stack.length) {
          continue
        }
        stack.push(value)
        return
      }
      if (until(value)) {
        return value
      }
    }
  }
  return {
    get: () => stack.at(-1)!,
    find(fn) {
      for (let i = 1; i <= stack.length; i++) {
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
    push,
    pop,
    Provider({ value, children }) {
      if (children) {
        push(value)
        try {
          return Fragment({ children }) as any
        } finally {
          pop((v: any) => v === value)
        }
      }
      return null
    },
  }
}
