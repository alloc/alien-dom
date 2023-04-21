import { computed } from '@preact/signals-core'
import { JSX } from './types/jsx'
import { kAlienThunkResult, kAlienElementKey, kAlienHooks } from './symbols'
import { currentComponent } from './global'
import { isElement } from './jsx-dom/util'
import { AlienHooks } from './hooks'
import { ElementKey } from './types/attr'

/**
 * Coerce a possible element thunk into an element (or a falsy value),
 * while ensuring the thunk isn't executed more than once in its
 * lifetime.
 */
export function fromElementProp(element: JSX.ElementProp): JSX.ElementOption

export function fromElementProp(
  element: JSX.ElementsProp
): Exclude<JSX.ElementsProp, () => JSX.ElementsProp>

export function fromElementProp(
  element: JSX.Children
): Exclude<JSX.Children, () => JSX.Children>

export function fromElementProp(element: JSX.Children) {
  if (typeof element === 'function') {
    return fromElementThunk(element)
  }
  return element
}

/** @internal */
export function fromElementThunk(thunk: () => JSX.Children) {
  if (!kAlienThunkResult.in(thunk)) {
    // The first component to call the thunk owns it.
    const component = currentComponent.get()
    if (!component) {
      return thunk()
    }

    const result = computed(thunk)

    // By caching the element here, we can reuse a mounted element even if
    // a parent component overwrites its element key, which can happen if
    // the current component returns it as the root element.
    let rootNode: Element | null | undefined
    let key: ElementKey | undefined

    Object.defineProperty(thunk, kAlienThunkResult.symbol, {
      get() {
        let newRootNode = result.value

        // TODO: support more than single element nodes
        if (isElement(newRootNode)) {
          const newKey = kAlienElementKey(newRootNode)
          if (newKey !== undefined) {
            // When no cached node exists, check the component refs in
            // case this thunk was recreated.
            if (rootNode === undefined) {
              rootNode = component.refs?.get(newKey)
              if (rootNode) {
                key = newKey
              }
            }

            const oldRootNode = rootNode
            if (rootNode !== newRootNode) {
              if (!rootNode || key !== newKey) {
                rootNode = newRootNode
                key = newKey
              }
            } else {
              key ??= newKey

              // If the element is unchanged, we need to disable the old
              // hooks before new hooks are added.
              const hooks = kAlienHooks(rootNode)
              hooks?.setElement(null)
            }

            if (rootNode && rootNode === oldRootNode) {
              // Emulate a JSX element being constructed.
              component.setRef(key, rootNode as any)

              // We have to set `newElements` here or else we'll confuse
              // the self-updating component into thinking it didn't
              // create this element (i.e. a child component did).
              if (rootNode === newRootNode) {
                component.newElements!.set(key, rootNode as any)
              } else {
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
