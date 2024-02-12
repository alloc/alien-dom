import { defineProperty, set } from '../internal/utils'
import { ReadonlyRef, isReadonlyRef } from '../observable'

export const attachRef = (
  props: object,
  key: keyof any,
  ref: ReadonlyRef,
  didSet?: (key: keyof any, newValue: any, oldValue: any) => void
) => {
  defineProperty(props, key, {
    configurable: true,
    enumerable: true,
    get: Reflect.get.bind(Reflect, ref, 'value'),
    set: isReadonlyRef(ref)
      ? () => {
          throw TypeError('Cannot update the value of a readonly ref.')
        }
      : didSet
      ? newValue => {
          const oldValue = ref.peek()
          set(ref, 'value', newValue)

          // Even if the value doesn't change, we still need to call
          // this, since it still communicates intent to the parent.
          didSet(key, newValue, oldValue)
        }
      : Reflect.set.bind(Reflect, ref, 'value'),
  })
}
