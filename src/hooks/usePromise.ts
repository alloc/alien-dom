import { OpenPromise } from '../addons/promises'
import { useSnapshot } from './useSnapshot'
import { useState } from './useState'

const newPromise = <T>() => new OpenPromise<T>()

/**
 * Create an open promise with `useState`-like semantics.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function usePromise<T>(): OpenPromise<T>

/**
 * Create an open promise with `useSnapshot`-like semantics.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function usePromise<T>(deps: readonly any[]): OpenPromise<T>

/** @internal */
export function usePromise<T>(deps?: readonly any[]): OpenPromise<T> {
  return deps ? useSnapshot(newPromise<T>, deps) : useState(newPromise<T>)
}
