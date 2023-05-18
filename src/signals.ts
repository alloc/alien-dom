import { isFunction } from '@alloc/is'
import {
  effect as createObserver,
  signal,
  Signal as Ref,
} from '@preact/signals-core'
import { defineEffectType } from './effects'

export { batch, computed, Signal as Ref } from '@preact/signals-core'
export type { ReadonlySignal as ReadonlyRef } from '@preact/signals-core'

/**
 * Any observable refs accessed inside your callback will cause it to
 * rerun when changed.
 *
 * The `observe` function creates an `AlienEffect` that will be cached
 * by the current `AlienEffects` context.
 *
 * It's **not recommended** to call this in a component (prefer
 * `useObserver` instead), since `observe` is unable to avoid re-running
 * on every render (even if nothing changed).
 */
export const observe = /* @__PURE__ */ defineEffectType(createObserver)

/**
 * Like `observe` but with a `target` argument that can be retargeted
 * later.
 */
export const observeAs = /* @__PURE__ */ defineEffectType(
  <T extends object | void>(target: T, action: (target: T) => void) =>
    createObserver(() => action(target))
)

/**
 * Create an observable reference. Use `.value` to access the current
 * value or update it by assignment.
 *
 * If you access a ref's value during render, a self-updating component
 * will re-render when its value is later changed.
 *
 * Same goes for `computed` and `observe` callbacks, which will rerun
 * when a ref's value is changed.
 */
export const ref = signal

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

const valueDescriptor = /* @__PURE__ */ Object.getOwnPropertyDescriptor(
  Ref.prototype,
  'value'
) as any

Object.defineProperties(Ref.prototype, {
  0: { get: valueDescriptor.get },
  1: {
    get() {
      return (arg: any) => {
        if (isFunction(arg)) {
          arg = arg(this.peek())
        }
        this.value = arg
      }
    },
  },
  [Symbol.iterator]: {
    value: function* () {
      yield this[0]
      yield this[1]
    },
  },
})
