import { useState } from './useState'
import { currentComponent } from '../global'

export function useMicrotask(effect: () => void, shouldRun = true) {
  const scope = currentComponent.get()!
  const state = useState(initialState)
  if (shouldRun) {
    const hooks = scope.hooks
    const nextRun = () => {
      if (nextRun == state.nextRun) {
        state.nextRun = undefined
        if (hooks.mounted) {
          effect()
        }
      }
    }

    // Only one microtask is scheduled at a time.
    // The last call is always preferred.
    state.nextRun = nextRun

    // Wait until mounted.
    hooks.enable(() => {
      queueMicrotask(nextRun)
    })
  }
}

type State = {
  nextRun?: () => void
}

function initialState(): State {
  return { nextRun: undefined }
}
