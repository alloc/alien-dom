import { ComputedRef, computed } from '../observable'
import { useMemo } from './useMemo'

/**
 * Like `useMemo` but a `ComputedRef` is returned, which is observable and
 * lazily computed.
 */
export const useComputed = <T>(
  fn: () => T,
  deps: readonly any[] = [],
  debugId?: string | number
): ComputedRef<T> => useMemo(computed.bind(null, fn, debugId), deps) as any
