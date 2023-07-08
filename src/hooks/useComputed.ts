import { ReadonlyRef, computed } from '../observable'
import { useMemo } from './useMemo'

/**
 * Like `useMemo` but a `ReadonlyRef` is returned, which is observable.
 */
export const useComputed = <T>(
  fn: () => T,
  deps: readonly any[] = []
): ReadonlyRef<T> => useMemo(computed.bind(null, fn), deps) as any
