import { OpenPromise } from '../addons/promises'
import { useConst } from './useConst'
import { usePeekMemo } from './usePeekMemo'

const newPromise = <T>() => new OpenPromise<T>()

/**
 * Create an open promise that can be recreated when the dependencies change and
 * when a component is hot-reloaded.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function usePromise<T>(deps: readonly any[]): OpenPromise<T>

/**
 * Create an open promise that exists for as long as its component instance
 * without an ability to recreate it.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function usePromise<T>(): OpenPromise<T>

/** @internal */
export function usePromise<T>(deps?: readonly any[]): OpenPromise<T> {
  return deps ? usePeekMemo(newPromise<T>, deps) : useConst(newPromise<T>)
}
