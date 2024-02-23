import { isArray } from '@alloc/is'
import { useDepsArray } from './useDepsArray'
import { useState } from './useState'

/**
 * Returns a new `AbortController` instance. When the `deps` argument changes,
 * the previous `AbortController` instance is aborted and a new one is created.
 */
export function useAbortController(deps: readonly any[]): AbortController

/**
 * The `signal` argument has its `abort `event propagated to the returned
 * `AbortController` instance. When the `deps` argument changes, the
 * `AbortController` instance is aborted and a new one is created.
 */
export function useAbortController(
  signal: AbortSignal | undefined,
  deps: readonly any[]
): AbortController

/**
 * The `signal` argument has its `abort `event propagated to the returned
 * `AbortController` instance.
 *
 * Note: The `signal` argument is captured on first render. It won't be updated
 * unless you use a dependency array.
 */
export function useAbortController(signal?: AbortSignal): AbortController

/** @internal */
export function useAbortController(
  arg?: AbortSignal | readonly any[],
  deps?: readonly any[]
) {
  const signal = isArray(arg) ? ((deps = arg), undefined) : arg
  const state = useState(initialState, signal)

  if (useDepsArray(deps)) {
    state.ctrl.abort()
    state.ctrl = new AbortController()
  }

  return state.ctrl
}

function initialState(signal?: AbortSignal): {
  ctrl: AbortController
  dispose: () => void
} {
  let state: ReturnType<typeof initialState>

  const abort = () => state.ctrl.abort()
  signal?.addEventListener('abort', abort)

  return (state = {
    ctrl: new AbortController(),
    dispose() {
      this.ctrl.abort()
      signal?.removeEventListener('abort', abort)
    },
  })
}
