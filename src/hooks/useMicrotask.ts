import { batch } from '@preact/signals-core'
import { useState } from './useState'
import { currentComponent } from '../global'

export function useMicrotask(effect: () => void, shouldRun = true) {
  const component = currentComponent.get()!
  const state = useState(initialState)
  if (shouldRun) {
    const hooks = component.newHooks!
    const nextRun = () => {
      if (nextRun == state.nextRun) {
        state.nextRun = undefined
        batch(effect)
      }
    }

    // Only one microtask is scheduled at a time.
    // The last call is always preferred.
    state.nextRun = nextRun

    // The hook is enabled in the microtask after the parent element is
    // set, so we don't need to call queueMicrotask() ourselves.
    hooks.enable(nextRun)
  }
}

const initialState = (): {
  nextRun?: () => void
} => ({
  nextRun: undefined,
})
