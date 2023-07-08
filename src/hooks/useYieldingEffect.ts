import { isFunction } from '@alloc/is'
import { Falsy } from '@alloc/types'
import { DisposablePromise } from '../promises'
import { EffectResult, useEffect } from './useEffect'

type VarArgs<T> = T | readonly T[]
type Yield = VarArgs<
  DisposablePromise<any> | Promise<any> | (() => void) | Falsy
>

export function useYieldingEffect(
  effect: () => Generator<any, EffectResult, Yield>,
  deps: readonly any[]
) {
  useEffect(() => {
    const generator = effect()

    let disposed = false

    const disposers: (() => void)[] = []
    const next = () => {
      if (disposed) return
      const result = generator.next()
      if (result.done) {
        if (isFunction(result.value)) {
          disposers.push(result.value)
        }
      } else if (isFunction(result.value)) {
        disposers.push(result.value)
      } else if (result.value instanceof Promise) {
        const promise = result.value as Promise<any> | DisposablePromise<any>
        promise.then(next, console.error)
        if ('dispose' in promise) {
          disposers.push(promise.dispose)
        }
      } else {
        next()
      }
    }

    next()
    return () => {
      disposed = true
      disposers.forEach(dispose => dispose())
    }
  }, deps)
}
