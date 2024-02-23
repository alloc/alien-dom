import { expectCurrentComponent } from '../internal/global'
import { useState } from './useState'

export function useMicrotask(effect: () => void, shouldRun = true) {
  const component = expectCurrentComponent()
  const state = useState(initialState)
  if (shouldRun) {
    const nextRun = () => {
      if (nextRun == state.nextRun) {
        state.nextRun = undefined
        effect()
      }
    }

    // Only one microtask is scheduled at a time.
    // The last call is always preferred.
    state.nextRun = nextRun

    // The effect is enabled in the microtask after the parent element
    // is set, so we don't need to call queueMicrotask() ourselves.
    component.newEffects.run(nextRun)
  }
}

const initialState = (): {
  nextRun?: () => void
} => ({
  nextRun: undefined,
})
