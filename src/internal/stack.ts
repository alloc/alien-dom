/**
 * The first value of a `Stack` is expected to be null.
 */
export type Stack<T> = [null, ...T[]]

export const expectLastValue =
  <T>(stack: Stack<T>, message: string) =>
  (): T => {
    const value = stack[stack.length - 1]
    if (value === null) {
      throw Error(message)
    }
    return value
  }

/**
 * Pop the stack until the given value is popped.
 */
export function popValue<T>(stack: Stack<T>, value: T) {
  while (true) {
    if (stack.length === 1) {
      throw Error('Stack is empty')
    }
    if (stack.pop() === value) {
      return
    }
  }
}
