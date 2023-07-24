import { evaluateDeferredNode, isDeferredNode } from '../jsx-dom/node'
import type { JSX } from '../types/jsx'
import { currentComponent } from './global'
import { kAlienThunkResult } from './symbols'

export function fromElementThunk(thunk: () => JSX.Children) {
  if (!kAlienThunkResult.in(thunk)) {
    // The first component to call the thunk owns it.
    const component = currentComponent.get()
    if (!component) {
      return thunk()
    }

    Object.defineProperty(thunk, kAlienThunkResult.symbol, {
      get() {
        // Avoid evaluating an element thunk more than once per render.
        let result: JSX.Children = component.newMemos
          ? component.newMemos.get(thunk)
          : undefined

        if (result === undefined) {
          result = thunk()
          if (isDeferredNode(result)) {
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
