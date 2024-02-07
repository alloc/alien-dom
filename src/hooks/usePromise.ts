import { OpenPromise } from '../addons/promises'
import { useMemo } from './useMemo'
import { useState } from './useState'

const newPromise = <T>() => new OpenPromise<T>()

/**
 * Create an open promise with `useState`-like semantics.
 */
export function usePromise<T>(): OpenPromise<T>

/**
 * Create an open promise with `useMemo`-like semantics.
 */
export function usePromise<T>(deps: readonly any[]): OpenPromise<T>

/** @internal */
export function usePromise<T>(deps?: readonly any[]): OpenPromise<T> {
  return deps ? useMemo(newPromise<T>, deps) : useState(newPromise<T>)
}
