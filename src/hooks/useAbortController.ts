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
  const state = useState(UseAbortController, signal)

  if (useDepsArray(deps)) {
    state.ctrl.abort()
    state.ctrl = new AbortController()
  }

  return state.ctrl
}

class UseAbortController {
  constructor(public signal: AbortSignal | undefined) {
    this.abort = signal ? () => this.ctrl.abort() : undefined
    signal?.addEventListener('abort', this.abort!)
  }
  ctrl = new AbortController()
  abort?: () => void
  dispose() {
    this.ctrl.abort()
    this.signal?.removeEventListener('abort', this.abort!)
  }
}
