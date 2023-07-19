import { isElement } from '../internal/duck'
import type { JSX } from '../types/jsx'
import { applyInitialPropsRecursively } from './applyProp'
import { isNode } from './duck'
import { currentComponent } from './global'
import { kAlienEffects, kAlienElementKey, kAlienThunkResult } from './symbols'

export function fromElementThunk(thunk: () => JSX.Children) {
  if (!kAlienThunkResult.in(thunk)) {
    // The first component to call the thunk owns it.
    const component = currentComponent.get()
    if (!component) {
      return thunk()
    }

    // By caching the element here, we can reuse a mounted element even if
    // a parent component overwrites its element key, which can happen if
    // the current component returns it as the root element.
    let rootNode: JSX.Element | null | undefined
    let key: JSX.ElementKey | undefined

    Object.defineProperty(thunk, kAlienThunkResult.symbol, {
      get() {
        // Avoid evaluating an element thunk more than once per render.
        let newRootNode: JSX.Children = component.memos?.get(thunk)
        if (newRootNode === undefined) {
          newRootNode = thunk()
          component.memos ||= new Map()
          component.memos.set(thunk, newRootNode)
        }

        // TODO: support more than single element nodes
        if (isNode(newRootNode) && isElement(newRootNode)) {
          const newKey = kAlienElementKey(newRootNode)
          if (newKey !== undefined) {
            // When no cached node exists, check the component refs in
            // case this thunk was recreated.
            if (rootNode === undefined) {
              rootNode = component.refs?.get(newKey) as any
              if (rootNode) {
                key = newKey
              }
            }

            const oldRootNode = rootNode
            if (rootNode !== newRootNode) {
              if (!rootNode || key !== newKey) {
                rootNode = newRootNode
                key = newKey

                // Apply initial props early, so that the caller can use query
                // selectors for slotting purposes.
                applyInitialPropsRecursively(newRootNode)
              }
            } else {
              key ??= newKey

              // If the element is unchanged, we need to disable the old
              // effects before new effects are added.
              const effects = kAlienEffects(rootNode)
              effects?.setElement(null)
            }

            if (rootNode && rootNode === oldRootNode) {
              // Emulate a JSX element being constructed.
              component.setRef(key, rootNode)

              if (rootNode !== newRootNode) {
                newRootNode = rootNode
              }
            }
          }
        } else {
          rootNode = null
        }

        return newRootNode
      },
    })
  }

  return kAlienThunkResult(thunk)
}
