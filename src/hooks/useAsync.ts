import { isFunction, isPlainObject } from '@alloc/is'
import { Exclusive, Falsy } from '@alloc/types'
import { Disposable } from '../disposable'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { keys } from '../jsx-dom/util'
import { ref } from '../observable'
import { useState } from './useState'

export type UseAsyncFn<T> = (state: UseAsync<T>) => PromiseLike<T> | T

export function useAsync<T>(
  get: UseAsyncFn<UseAsyncAwaited<T>> | Falsy,
  deps: readonly any[]
) {
  const instance = useState(UseAsync<UseAsyncAwaited<T>>, deps)
  if (!get) {
    instance.stale = true
    instance.abort()
  } else {
    const reset = depsHaveChanged(deps, instance.deps)
    instance.deps = deps

    if (reset && instance.numAttempts > 0) {
      instance.abort()
    }

    if (reset || instance.stale) {
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

type UseAsyncState = Exclusive<
  { loaded: any } | { error: any } | { retries: number } | { aborted: true }
>

export class UseAsync<T> {
  private state = ref<UseAsyncState | null>(null)
  private abortCtrl = new AbortController()
  timestamp: number | null = null
  promise: Promise<void> | null = null
  effects: Disposable[] = []
  numAttempts = 0
  stale = true

  constructor(public deps: readonly any[]) {}

  /** @observable */
  get status() {
    const state = this.state.value
    return state
      ? state.aborted
        ? 'idle'
        : state.retries
        ? 'loading'
        : (keys(state)[0] as Exclude<keyof typeof state, 'aborted' | 'retries'>)
      : this.promise
      ? 'loading'
      : 'idle'
  }

  /** @observable */
  get result(): T | undefined {
    return this.state.value?.loaded
  }

  /** @observable */
  get error() {
    return this.state.value?.error
  }

  get abort() {
    return () => {
      const state = this.state.peek()
      if (state && !state.aborted) {
        this.abortCtrl.abort()
        this.promise = null
        this.numAttempts = 0
        this.state.value = { aborted: true }
        this.effects.forEach(effect => effect.dispose())
      }
    }
  }

  get aborted() {
    return this.abortCtrl.signal.aborted
  }

  get abortSignal() {
    return this.abortCtrl.signal
  }

  get retry() {
    return (reset?: boolean) => {
      if (reset) {
        this.abort()
      }
      const state = this.state.peek()
      if (state && !('value' in state)) {
        this.stale = true
        this.state.value = {
          retries: (state.retries || 0) + 1,
        }
      }
    }
  }

  markAttempt() {
    this.stale = false
    this.timestamp = Date.now()
    this.numAttempts++
    if (this.aborted) {
      this.abortCtrl = new AbortController()
    }
  }

  setPromise(promise: Promise<any>) {
    this.promise = promise = promise.then(
      loaded => {
        if (promise === this.promise) {
          this.promise = null
          this.state.value = { loaded }
        }
      },
      error => {
        if (promise === this.promise) {
          this.promise = null
          this.state.value = { error }
        }
      }
    )

    // Subscribe to changes.
    this.state.value
  }

  /**
   * Track a disposable effect that will be disposed when the component unmounts
   * or the async getter is called again.
   */
  get track() {
    const { abortSignal, effects } = this
    function track(effect: () => void): typeof effect
    function track<E extends Disposable>(effect: E): E
    function track(effect: Disposable | (() => void)): any {
      if (isFunction(effect)) {
        effect = { dispose: effect }
      }
      if (abortSignal.aborted) {
        effect.dispose()
        abortSignal.throwIfAborted()
      }
      effects.push(effect)
      return effect
    }
    return track
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
    if (isPlainObject(results)) {
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
  : T extends (...args: any[]) => any
  ? T
  : T extends object
  ? { [K in keyof T]: Awaited<T[K]> }
  : T
