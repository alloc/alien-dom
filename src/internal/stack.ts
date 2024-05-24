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
