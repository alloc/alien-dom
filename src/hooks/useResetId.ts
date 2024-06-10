import { isBoolean, isFunction, isString } from '@alloc/is'
import { ReadonlyRef, Ref, ref } from '../core/observable'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { createGuid } from '../internal/guid'
import { useApply } from './internal/useApply'
import { useConst } from './useConst'
import { useHookOffset } from './useHookOffset'
import { useObserver } from './useObserver'

/**
 * This hook is useful for generating a guid that changes on each render
 * where a particular condition is true or a dependency array has
 * changed.
 *
 * 🪝 This hook adds 4 to the hook offset.
 */
export function useResetId(reset: ResetOption): number
export function useResetId(reset: ResetOption | undefined): number | false

export function useResetId(reset: string): string
export function useResetId(reset: string | undefined): string | false

export function useResetId(
  reset: string | ResetOption | undefined
): string | number | false

export function useResetId(
  compute: () => ResetOption,
  deps: readonly any[]
): ReadonlyRef<number>

export function useResetId(reset: any, deps?: readonly any[]) {
  // Allow the caller to disable resets.
  if (reset === undefined) {
    useHookOffset(4)
    return false
  }

  // Allow the caller to handle resets manually.
  if (isString(reset)) {
    useHookOffset(4)
    return reset
  }

  const state = useConst(UseResetId, isFunction(reset))
  const container = state.ref || state

  // Allow the caller to compute resets.
  if (isFunction(reset)) {
    const compute: () => ResetOption = reset
    useObserver(() => {
      // Determine if a reset is necessary.
      const reset = compute()
      const force = resolveReset(reset, state.prevReset, false)
      state.prevReset = isBoolean(reset) ? undefined : reset

      // Either create a new id or use the previous one.
      container.value = createGuid(container, 'value', force)
    }, deps!)

    return state.ref as ReadonlyRef<number>
  }

  const force = resolveReset(reset, state.prevReset)
  const result = createGuid(container, 'value', force)
  useApply(() => {
    state.prevReset = isBoolean(reset) ? undefined : reset
    container.value = result
  })

  useHookOffset(2)
  return result
}

class UseResetId {
  ref: Ref<number> | undefined
  value?: number = undefined
  prevReset?: readonly any[] = undefined
  constructor(isCompute: boolean) {
    this.ref = isCompute ? ref(createGuid()) : undefined
  }
}

type ResetOption = boolean | readonly any[]

function resolveReset(
  reset: ResetOption,
  prevReset: readonly any[] | undefined,
  defaultReset = true
): boolean | undefined {
  if (isBoolean(reset)) {
    return reset
  }
  if (prevReset) {
    return depsHaveChanged(reset, prevReset)
  }
  return defaultReset
}
