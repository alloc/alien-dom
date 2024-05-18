import { ReadonlyRef } from '../core/observable'
import { evaluateDeferredNode, isDeferredNode } from '../jsx-dom/node'
import type { JSX } from '../types/jsx'
import { currentComponent } from './global'
import { kAlienThunkResult } from './symbols'
import { defineProperty, lastValue } from './util'

export type ElementThunkResult =
  | ReadonlyRef<JSX.Children>
  | JSX.Children
  | JSX.ElementLike
  | JSX.ElementLike[]

export function fromElementThunk<Result extends ElementThunkResult>(
  thunk: () => Result,
  keepDeferred?: boolean
): Result {
  if (!kAlienThunkResult.in(thunk)) {
    // The first component to call the thunk owns it.
    const component = lastValue(currentComponent)
    if (!component) {
      return thunk()
    }

    defineProperty(thunk, kAlienThunkResult.symbol, {
      get() {
        // Avoid evaluating an element thunk more than once per render.
        let result: ElementThunkResult = component.newMemos
          ? component.newMemos.get(thunk)
          : undefined

        if (result === undefined) {
          result = thunk()
          if (isDeferredNode(result)) {
            if (keepDeferred) {
              return result
            }
            result = evaluateDeferredNode(result)
          }
          component.newMemos ||= new Map()
          component.newMemos.set(thunk, result)
        }
        return result
      },
    })
  }

  return kAlienThunkResult(thunk) as any
}
