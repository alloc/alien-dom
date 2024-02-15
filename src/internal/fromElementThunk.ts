import { evaluateDeferredNode, isDeferredNode } from '../jsx-dom/node'
import { ReadonlyRef } from '../observable'
import type { JSX } from '../types/jsx'
import { currentComponent } from './global'
import { kAlienThunkResult } from './symbols'
import { defineProperty } from './util'

type ThunkResult = JSX.Children | ReadonlyRef<JSX.Children>

export function fromElementThunk(
  thunk: () => ThunkResult,
  keepDeferred?: boolean
) {
  if (!kAlienThunkResult.in(thunk)) {
    // The first component to call the thunk owns it.
    const component = currentComponent.get()
    if (!component) {
      return thunk()
    }

    defineProperty(thunk, kAlienThunkResult.symbol, {
      get() {
        // Avoid evaluating an element thunk more than once per render.
        let result: ThunkResult = component.newMemos
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

  return kAlienThunkResult(thunk)
}
