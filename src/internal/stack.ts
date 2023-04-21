export function createStack<T>(baseValue?: T) {
  const stack: (T | null)[] = [baseValue ?? null]
  return {
    is: (value: T) => stack.at(-1) === value,
    get: stack.at.bind(stack, -1) as () => T | null,
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
