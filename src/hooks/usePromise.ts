import { ref, ReadonlyRef } from '../signals'
import { useMemo } from './useMemo'
import { useState } from './useState'
import { noop } from '../jsx-dom/util'

type Promisable<T> = T | PromiseLike<T>

/**
 * Create a controlled promise with `useState`-like semantics.
 */
export function usePromise<T>(): AlienPromise<T>

/**
 * Create a controlled promise with `useMemo`-like semantics.
 */
export function usePromise<T>(deps: readonly any[]): AlienPromise<T>

/** @internal */
export function usePromise<T>(deps?: readonly any[]): AlienPromise<T> {
  return deps ? useMemo(newPromise<T>, deps) : useState(newPromise<T>)
}

const newPromise = <T>() => new AlienPromise<T>()

export class AlienPromise<T> extends Promise<T> {
  readonly resolve: void extends T
    ? (value?: Promisable<T>) => void
    : (value: Promisable<T>) => void

  readonly reject: (reason?: any) => void

  get settled(): boolean {
    const settled = ref(false)
    this.finally(() => (settled.value = true))
    Object.defineProperty(this, 'settled', {
      get: Reflect.get.bind(Reflect, settled, 'value'),
    })
    return settled.value
  }

  constructor(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void
    ) => void = noop
  ) {
    let resolve: any, reject: any
    super((res, rej) => (executor(res, rej), (resolve = res), (reject = rej)))
    this.resolve = resolve
    this.reject = reject
  }
}
