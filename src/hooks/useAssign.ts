import { keys } from '../internal/util'
import { useApply } from './internal/useApply'
import { useConst } from './useConst'

/**
 * Apply the properties of the `source` object to the `target` object. If a
 * `source` property has an undefined value, the initial value of the `target`
 * object is used instead.
 *
 * The `target` object is updated within a `useEffect` callback.
 *
 * Every possible property of the `target` object must exist. In other words,
 * you must explicitly define each property, even if `undefined` is used as the
 * initial value. This requirement allows the hook to “unset” a property when
 * it's undefined in the `source` object. It's also good for performance.
 *
 * 🪝 This hook adds 2 to the hook offset.
 */
export function useAssign<T extends object>(target: T, source: Partial<T>) {
  // Store the initial values of the target to be used as default values when
  // the source's value is undefined.
  const initial = useConst(clone, target)

  useApply(() => {
    const update = Object.assign({}, initial, source)
    for (const key of keys(update)) {
      if (DEV && !(key in initial)) {
        throw Error(
          `useAssign: The property "${key}" does not exist in the target object. Did you misspell the property or forget to initialize it?`
        )
      }
      // If the value is undefined, use the initial value.
      target[key] = update[key] === undefined ? initial[key] : update[key]
    }
  })

  return initial
}

function clone<T extends object>(target: T) {
  return Object.assign({}, target)
}
