import { EffectCallback, useEffect } from './useEffect'

/**
 * Set a timeout to run an effect after a delay, with proper cleanup on unmount.
 *
 * If no dependency array is given, the effect runs once (even if the `delay`
 * argument value is changed in a future render).
 */
export function useDelayedEffect(
  delay: number,
  effect: EffectCallback,
  deps: readonly any[] = []
) {
  useEffect(() => {
    let result: ReturnType<EffectCallback>

    const timerId = setTimeout(() => {
      try {
        result = effect()
      } catch (error) {
        console.error(error)
      }
    }, delay)

    return () => {
      clearTimeout(timerId)
      if (typeof result == 'function') {
        try {
          result()
        } catch (error) {
          console.error(error)
        }
      }
    }
  }, deps)
}
