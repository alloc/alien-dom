import { Falsy } from '@alloc/types'
import {
  ArrayOperation,
  ArrayRef,
  observeArrayOperations,
} from '../core/observable'
import { useEffect } from './useEffect'
import { useHookOffset } from './useHookOffset'
import { useStableCallback } from './useStableCallback'

/**
 * Observe the fine-grained changes to an `ArrayRef` object.
 *
 * 🪝 This hook adds 2 to the hook offset.
 */
export function useArrayObserver<T>(
  arrayRef: ArrayRef<T> | Falsy,
  handler: ArrayOperation.Handler<T>
) {
  if (!arrayRef) {
    useHookOffset(2)
    return
  }
  handler = useStableCallback(handler)
  useEffect(() => {
    return observeArrayOperations(arrayRef, handler).destructor
  }, [arrayRef])
}
