import { useComputed } from './useComputed'

/**
 * Create a `ComputedRef` and access its value immediately. Any observable
 * values used within the memoize function may cause the component to rerender
 * when changed (as necessary).
 */
export function useMemo<T>(get: () => T, deps: readonly any[]): T {
  return useComputed(get, deps).value
}
