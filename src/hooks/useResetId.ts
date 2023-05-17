import { usePrevious } from './usePrevious'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { useGlobalId } from './useGlobalId'

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
export function useResetId(
  reset: boolean | readonly any[] | undefined
): number | false {
  const prevReset = reset !== undefined ? usePrevious(reset) : null
  if (reset === undefined) {
    reset = false
  } else if (typeof reset !== 'boolean') {
    reset = !Array.isArray(prevReset) || depsHaveChanged(reset, prevReset)
  }
  return prevReset !== null && useGlobalId(reset)
}
