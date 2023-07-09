import { ComputedRef, computed } from '../observable'
import { useMemo } from './useMemo'

/**
 * Like `useMemo` but a `ComputedRef` is returned, which is observable and
 * lazily computed.
 */
export const useComputed = <T>(
  fn: () => T,
  deps: readonly any[] = []
): ComputedRef<T> => useMemo(computed.bind(null, fn), deps) as any
