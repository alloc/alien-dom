import { ReadonlyRef } from '../core/observable'
import { defineProperty } from '../internal/util'

export const attachRef = (
  props: object,
  key: keyof any,
  ref: ReadonlyRef,
  didSet?: (key: keyof any, newValue: any, oldValue: any) => void
) => {
  const { get, set } = Object.getOwnPropertyDescriptor(ref, 'value')!

  defineProperty(props, key, {
    configurable: true,
    enumerable: true,
    get: get,
    set: set
      ? didSet
        ? newValue => {
            const oldValue = ref.peek()
            set.call(ref, newValue)
            if (!Object.is(newValue, oldValue)) {
              didSet(key, newValue, oldValue)
            }
          }
        : set
      : undefined,
  })
  return ref
}
