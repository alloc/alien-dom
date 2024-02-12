import { defineProperty } from '../internal/utils'
import { Ref } from '../observable'

export const attachRef = (
  props: object,
  key: keyof any,
  ref: Ref,
  didSet?: (key: keyof any, newValue: any, oldValue: any) => void
) => {
  defineProperty(props, key, {
    configurable: true,
    enumerable: true,
    get: Reflect.get.bind(Reflect, ref, 'value'),
    set: didSet
      ? newValue => {
          const oldValue = ref.peek()
          ref.value = newValue

          // Even if the value doesn't change, we still need to call
          // this, since it still communicates intent to the parent.
          didSet(key, newValue, oldValue)
        }
      : Reflect.set.bind(Reflect, ref, 'value'),
  })
}
