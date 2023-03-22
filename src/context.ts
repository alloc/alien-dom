export interface AlienContext<T> {
  get: () => T
  find: (fn: (value: NonNullable<T>) => unknown) => T | undefined
  replace: (oldValue: T | null | undefined, value: T) => T
  push: <U extends T>(value: U) => U
  pop: {
    (until?: (value: NonNullable<T>) => boolean): T | undefined
    (value: Exclude<T, (...args: any) => any>): void
  }
}

export function createContext<T>(initial?: T): AlienContext<T> {
  const stack = [initial]
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
    push(value) {
      stack.push(value)
      return value
    },
    pop(arg) {
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
    },
  }
}
