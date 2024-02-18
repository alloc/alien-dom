import { depsHaveChanged } from '../functions/depsHaveChanged'
import { createGuid } from '../internal/guid'
import { ReadonlyRef, ref } from '../observable'
import { useObserver } from './useObserver'
import { useState } from './useState'

/**
 * This hook is useful for generating a guid that changes on each render
 * where a particular condition is true or a dependency array has
 * changed.
 *
 * ⚠️ The `reset` argument must never switch between a defined and
 * undefined state. This limitation allows the `useResetId` hook to
 * reduce its memory impact to zero when the `reset` argument is
 * undefined.
 */
export function useResetId(reset: ResetOption): number
export function useResetId(reset: ResetOption | undefined): number | false

export function useResetId(reset: string): string
export function useResetId(reset: string | undefined): string | false

export function useResetId(
  reset: string | ResetOption | undefined
): string | number | false

export function useResetId(compute: () => ResetOption): ReadonlyRef<number>

export function useResetId(reset: any) {
  if (reset === undefined) {
    // Allow the caller to disable resets.
    return false
  }
  if (typeof reset === 'string') {
    // Allow the caller to handle resets manually.
    return reset
  }
  const state = useState(initialState, reset)
  if (typeof reset === 'function') {
    const compute: () => ResetOption = reset
    useObserver(() => {
      createId(state, compute(), false)
    }, [compute])

    return state.ref as ReadonlyRef<number>
  }
  return createId(state, reset)
}

type State = ReturnType<typeof initialState>

const initialState = (reset: ResetOption | (() => ResetOption)) => ({
  prevReset: undefined as ResetOption | undefined,
  value: undefined as number | undefined,
  ref: typeof reset === 'function' ? ref(createGuid()) : undefined,
})

type ResetOption = boolean | readonly any[]

function createId(
  state: State,
  reset: ResetOption,
  defaultReset = true
): number {
  if (typeof reset !== 'boolean') {
    const deps = reset
    if (Array.isArray(state.prevReset)) {
      reset = deps !== state.prevReset && depsHaveChanged(deps, state.prevReset)
    } else {
      reset = defaultReset
    }
    state.prevReset = deps
  }
  return createGuid(state.ref || state, 'value', reset)
}
