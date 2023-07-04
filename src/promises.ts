import { attachDisposer } from './disposable'
import { noop } from './jsx-dom/util'
import { ref } from './signals'

export type Promisable<T> = T | PromiseLike<T>

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

export function promiseTimeout(delay: number) {
  let timerId: any, dispose: () => void
  return attachDisposer(
    new Promise<void>(resolve => (timerId = setTimeout(resolve, delay))),
    (dispose = () => clearTimeout(timerId))
  )
}

/**
 * Disposable promises are useful for async dependencies that need to be
 * disposed of when the component unmounts. For example, async data should stop
 * loading on unmount and event listeners should be removed.
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
