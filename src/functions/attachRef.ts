import { ReadonlyRef } from '../core/observable'
import { defineProperty } from '../internal/util'

export const attachRef = (
  props: object,
  key: keyof any,
  ref: ReadonlyRef,
  didSet?: (key: keyof any, newValue: any, oldValue: any) => void
) => {
  const { get, set } = findPropertyDescriptor(ref, 'value') as {
    get: () => any
    set?: (value: any) => void
  }

  defineProperty(props, key, {
    configurable: true,
    enumerable: true,
    get: get.bind(ref),
    set: set
      ? didSet
        ? newValue => {
            const oldValue = ref.peek()
            set.call(ref, newValue)
            if (!Object.is(newValue, oldValue)) {
              didSet(key, newValue, oldValue)
            }
          }
        : set.bind(ref)
      : undefined,
  })
  return ref
}

function findPropertyDescriptor(obj: object, key: keyof any) {
  let proto = obj
  do {
    const descriptor = Object.getOwnPropertyDescriptor(proto, key)
    if (descriptor) {
      return descriptor
    }
    proto = Object.getPrototypeOf(proto)
  } while (proto && proto !== Object.prototype)
}
