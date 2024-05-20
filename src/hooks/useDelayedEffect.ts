import { isFunction, isNumber } from '@alloc/is'
import { Falsy } from '@alloc/types'
import { DisposablePromise } from '../addons/promises'
import { VarArgs } from '../internal/types'
import { toArray } from '../internal/util'
import { EffectCallback, useWrappedEffect } from './useEffect'

/**
 * Set a timeout to run an effect after a delay, with proper cleanup on unmount.
 *
 * If no dependency array is given, the effect runs once (even if the `delay`
 * argument value is changed in a future render).
 */
export function useDelayedEffect(
  delay: VarArgs<number | DisposablePromise<any>>,
  effect: EffectCallback | Falsy,
  deps: readonly any[] = []
) {
  useWrappedEffect(
    effect,
    effect => {
      let result: ReturnType<EffectCallback>
      let numPending = 0

      const finishOne = () => {
        if (--numPending == 0) {
          try {
            result = effect()
          } catch (error) {
            console.error(error)
          }
        }
      }

      const disposers = toArray(delay).map(delay => {
        numPending++
        if (isNumber(delay)) {
          const timerId = setTimeout(finishOne, delay)
          return () => clearTimeout(timerId)
        }
        delay.then(finishOne)
        return () => delay.dispose()
      })

      return () => {
        if (isFunction(result)) {
          try {
            result()
          } catch (error) {
            console.error(error)
          }
        } else {
          disposers.forEach(dispose => dispose())
        }
      }
    },
    deps
  )
}
