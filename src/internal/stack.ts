export function createStack<T>() {
  const stack: (T | null)[] = [null]
  return {
    get: stack.at.bind(stack, -1),
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
