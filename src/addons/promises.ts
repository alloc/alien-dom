import { defineProperty, noop } from '../internal/utils'
import { ref } from '../observable'
import { attachDisposer, isDisposable } from './disposable'

export type Promisable<T> = T | PromiseLike<T>

/**
 * A disposable promise for a one-time event.
 */
export function promiseEvent<T extends Event>(
  target: EventTarget,
  type: string
) {
  let listener: (event: Event) => void, dispose: () => void
  return attachDisposer(
    new Promise<T>(resolve =>
      target.addEventListener(
        type,
        (listener = (event: Event) => (dispose(), resolve(event as any)))
      )
    ),
    (dispose = () => {
      target.removeEventListener(type, listener)
    })
  )
}

/**
 * A disposable promise for `setTimeout`.
 */
export function promiseTimeout(delay: number) {
  let timerId: any, dispose: () => void
  return attachDisposer(
    new Promise<void>(resolve => (timerId = setTimeout(resolve, delay))),
    (dispose = () => clearTimeout(timerId))
  )
}

/**
 * A disposable `Promise.race` that disposes all promises when settled.
 */
export function promiseRace<T>(promises: Iterable<T | PromiseLike<T>>) {
  let dispose: () => void
  return attachDisposer(
    Promise.race(promises).finally(() => dispose()),
    (dispose = () => {
      for (const promise of promises) {
        if (promise instanceof Promise && isDisposable(promise)) {
          promise.dispose()
        }
      }
    })
  )
}

/**
 * Disposable promises are useful for async dependencies that need to be
 * disposed of when the component unmounts. For example, async data should stop
 * loading on unmount and event listeners should be removed.
 *
 * NOTE: This type is meant for arguments. For return values, use `Disposable<Promise<T>>`.
 */
export interface DisposablePromise<T> extends PromiseLike<T> {
  dispose: () => void
}

/**
 * An "open promise" can be resolved/rejected from outside the promise and its
 * settled state can be checked (and even observed).
 */
export class OpenPromise<T> extends Promise<T> {
  readonly resolve: void extends T
    ? (value?: Promisable<T>) => void
    : (value: Promisable<T>) => void

  readonly reject: (reason?: any) => void

  get settled(): boolean {
    const settled = ref(false)
    this.finally(() => (settled.value = true))
    defineProperty(this, 'settled', {
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
