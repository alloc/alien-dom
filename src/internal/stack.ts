import { at } from './util'

export function createStack<T>(baseValue?: T) {
  const stack: (T | null)[] = [baseValue ?? null]
  return {
    is: (value: T) => at(stack, -1) === value,
    get: () => at(stack, -1),
    push: (value: T) => void stack.push(value),
    pop(value: T) {
      while (true) {
        if (stack.length === 1) {
          throw new Error('Stack is empty')
        }
        if (stack.pop() === value) {
          return
        }
      }
    },
  }
}
