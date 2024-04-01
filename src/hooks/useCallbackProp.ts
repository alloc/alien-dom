import { Falsy } from '@alloc/types'
import { useState } from './useState'

/**
 * This creates a stable callback (i.e. its reference never changes) whose
 * implementation is updated on every render.
 *
 * This is most beneficial for callbacks used in run-once effects.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function useCallbackProp<T extends (...args: any[]) => any>(
  callback: T
): T

export function useCallbackProp<T extends (...args: any[]) => void>(
  callback: T | Falsy
): T

export function useCallbackProp<T extends (...args: any[]) => any>(
  callback: T | Falsy
) {
  const state = useState(UseCallbackProp<T>)
  state.callback = callback
  return state.wrapper
}

class UseCallbackProp<T extends (...args: any[]) => any> {
  callback: T | Falsy = false
  wrapper = (...args: any[]) => {
    if (this.callback) {
      return this.callback.apply(this, args)
    }
  }
}
