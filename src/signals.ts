import {
  effect as createEffect,
  signal as ref,
  Signal as Ref,
} from '@preact/signals-core'
import { createHookType } from './hooks'

export {
  batch,
  computed,
  signal as ref,
  Signal as Ref,
} from '@preact/signals-core'

export type { ReadonlySignal as ReadonlyRef } from '@preact/signals-core'

export const effect = createHookType(createEffect)

export const targetedEffect = createHookType(
  <T extends object | void>(target: T, action: (target: T) => void) =>
    createEffect(() => action(target))
)

export const refs = <Props extends object>(
  initialProps: Props,
  didSet?: (key: keyof Props, newValue: any, oldValue: any) => void
) => {
  const props = {} as Props
  for (const [key, value] of Object.entries(initialProps)) {
    attachRef(
      props,
      key,
      ref(value),
      didSet as (key: keyof any, newValue: any, oldValue: any) => void
    )
  }
  return props
}

export const attachRef = (
  props: object,
  key: keyof any,
  ref: Ref,
  didSet?: (key: keyof any, newValue: any, oldValue: any) => void
) => {
  Object.defineProperty(props, key, {
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

const valueDescriptor = Object.getOwnPropertyDescriptor(
  Ref.prototype,
  'value'
) as any

Object.defineProperties(Ref.prototype, {
  0: { get: valueDescriptor.get },
  1: {
    get() {
      return valueDescriptor.set.bind(this)
    },
  },
  [Symbol.iterator]: {
    value: function* () {
      yield this[0]
      yield this[1]
    },
  },
})
