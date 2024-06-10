import { isArray } from '@alloc/is'
import { DisposableHook, useConstructor } from './useConstructor'
import { useDepsArray } from './useDepsArray'
import { useEffect } from './useEffect'

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
  deps: readonly any[] = []
) {
  const signal = isArray(arg) ? ((deps = arg), undefined) : arg
  const hook = useConstructor(UseAbortController)

  useEffect(() => {
    hook.setSignal(signal)
  }, [signal])

  if (useDepsArray(deps)) {
    hook.ctrl.abort()
    hook.ctrl = new AbortController()
  }

  return hook.ctrl
}

class UseAbortController implements DisposableHook {
  ctrl = new AbortController()
  signal?: AbortSignal = undefined
  abort?: () => void = undefined

  setSignal(signal: AbortSignal | undefined) {
    if (this.signal) {
      this.signal.removeEventListener('abort', this.abort!)
    }
    this.signal = signal
    this.abort = signal ? () => this.ctrl.abort() : undefined
    signal?.addEventListener('abort', this.abort!)
  }

  dispose() {
    this.ctrl.abort()
    this.setSignal(undefined)
  }
}
