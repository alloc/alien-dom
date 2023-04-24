import { Exclusive, Falsy } from '@alloc/types'
import { isObject } from '../jsx-dom/util'
import { ref } from '../signals'
import { useState } from './useState'
import { depsHaveChanged } from '../internal/deps'

export type UseAsyncFn<T> = (state: UseAsync<T>) => PromiseLike<T> | T

export function useAsync<T>(
  get: ((state: UseAsync<any>) => T) | Falsy,
  deps: readonly any[]
) {
  const instance = useState(UseAsync<UseAsyncAwaited<T>>, deps)
  if (!get) {
    instance.disabled = true
    instance.abort()
  } else {
    const reset = depsHaveChanged(deps, instance.deps)
    instance.deps = deps

    if (reset && instance.numAttempts > 0) {
      instance.abort()
    }

    if (reset || instance.disabled) {
      let promise: Promise<any>
      try {
        instance.markAttempt()
        promise = resolveAsyncResults(get(instance))
      } catch (error: any) {
        promise = Promise.reject(error)
      }
      instance.setPromise(promise)
    }
  }
  return instance
}

type UseAsyncResult = Exclusive<
  { value: any } | { error: any } | { retries: number }
>

export class UseAsync<T> {
  private status = ref<UseAsyncResult | null>(null)
  private abortCtrl = new AbortController()
  timestamp: number | null = null
  promise: Promise<void> | null = null
  numAttempts = 0
  disabled = true

  constructor(public deps: readonly any[]) {}

  get result(): T | undefined {
    return this.status.value?.value
  }
  get error() {
    return this.status.value?.error
  }
  get isPending() {
    return this.promise !== null
  }
  get abort() {
    return () => {
      this.abortCtrl.abort()
      this.promise = null
      this.numAttempts = 0
    }
  }
  get aborted() {
    return this.abortCtrl.signal.aborted
  }
  get abortSignal() {
    return this.abortCtrl.signal
  }
  get retry() {
    return () => {
      const status = this.status.peek()
      if (status && !('value' in status)) {
        this.disabled = true
        this.status.value = {
          retries: status?.retries !== undefined ? status.retries + 1 : 1,
        }
      }
    }
  }

  markAttempt() {
    this.disabled = false
    this.timestamp = Date.now()
    this.numAttempts++
    if (this.aborted) {
      this.abortCtrl = new AbortController()
    }
  }

  setPromise(promise: Promise<any>) {
    this.promise = promise = promise.then(
      value => {
        if (promise === this.promise) {
          this.promise = null
          this.status.value = { value }
        }
      },
      error => {
        if (promise === this.promise) {
          this.promise = null
          this.status.value = { error }
        }
      }
    )

    // Subscribe to changes.
    this.status.value
  }

  protected dispose() {
    this.abort()
  }
}

function resolveAsyncResults(results: any): Promise<any> {
  if (!isPromiseLike(results)) {
    if (Array.isArray(results)) {
      return Promise.all(results.map(resolveAsyncResults))
    }
    if (isObject(results)) {
      const promises: PromiseLike<any>[] = []
      for (const key in results) {
        const value = results[key]
        if (isPromiseLike(value)) {
          promises.push(
            value.then((result: any) => {
              results[key] = result
            })
          )
        }
      }
      return Promise.all(promises).then(() => results)
    }
  }
  return Promise.resolve(results)
}

function isPromiseLike(value: any): value is PromiseLike<any> {
  return !!value && typeof value.then === 'function'
}

/**
 * The result of a `useAsync` callback is processed such that an array
 * of promises, an array of objects with promise values, or an object
 * with promise values is awaited. If the callback's return value is a
 * promise, any resulting array or object **won't** be processed.
 */
export type UseAsyncAwaited<T> = T extends readonly (infer Item)[]
  ? UseAsyncAwaitedItem<Item>[]
  : UseAsyncAwaitedItem<T>

type UseAsyncAwaitedItem<T> = T extends PromiseLike<infer Item>
  ? UseAsyncAwaited<Item>
  : T extends object
  ? { [K in keyof T]: Awaited<T[K]> }
  : T
