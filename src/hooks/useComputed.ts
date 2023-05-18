import { useMemo } from './useMemo'
import { computed } from '@preact/signals-core'
import type { ReadonlyRef } from '../signals'

/**
 * Like `useMemo` but a `ReadonlyRef` is returned, which is observable.
 */
export const useComputed = <T>(
  fn: () => T,
  deps: readonly any[] = []
): ReadonlyRef<T> => useMemo(computed.bind(null, fn), deps) as any
