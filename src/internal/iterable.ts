import { defineProperty } from './util'

export function makeIterable<T extends object>(
  obj: T,
  values: { [index: number]: any } & { length: number }
): T {
  return defineProperty(obj, Symbol.iterator, {
    value: function* () {
      for (let i = 0; i < values.length; i++) {
        yield values[i]
      }
    },
  })
}
