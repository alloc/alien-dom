import { Falsy } from '@alloc/types'
import { useComputed } from './useComputed'
import { useHookOffset } from './useHookOffset'

/**
 * Create a `ComputedRef` and access its value immediately. Any observable
 * values used within the memoize function may cause the component to rerender
 * when changed (as necessary).
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function useMemo<T>(get: () => T, deps: readonly any[]): T

export function useMemo<T>(
  get: (() => T) | Falsy,
  deps: readonly any[]
): T | undefined

export function useMemo<T>(
  get: (() => T) | Falsy,
  deps: readonly any[]
): T | undefined {
  if (get) return useComputed(get, deps).value
  useHookOffset(1)
}
