import { useMemo } from './useMemo'

/**
 * This creates a stable callback (i.e. its reference never changes) whose
 * implementation is updated on every render.
 *
 * This is most beneficial for callbacks used in run-once effects.
 */
export function useCallbackProp<T extends (...args: any[]) => any>(
  callback: T
): T

export function useCallbackProp<T extends (...args: any[]) => void>(
  callback: T | false | null | undefined
): T

export function useCallbackProp<T extends (...args: any[]) => any>(
  callback: T | false | null | undefined
) {
  const state = useMemo(() => ({ callback }), [])
  state.callback = callback

  return function (this: any, ...args: any[]) {
    if (state.callback) {
      return state.callback.apply(this, args)
    }
  } as T
}
