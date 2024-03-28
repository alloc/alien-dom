import { isArray, isFunction } from '@alloc/is'
import { Ref, ref } from './core/observable'
import { attachRef } from './functions/attachRef'
import { depsHaveChanged } from './functions/depsHaveChanged'
import { setComponentRenderHook } from './internal/component'
import { createSymbolProperty } from './internal/symbolProperty'
import { kAlienRenderFunc } from './internal/symbols'
import type { FunctionComponent } from './types/component'

const kAlienComponentKey = createSymbolProperty<string>('componentKey')

type HotComponent = [
  component: Ref<(props: any) => any>,
  hash: string,
  deps: any[]
]

const componentRegistry: { [key: string]: HotComponent } = {}

export function hmrRegister(
  key: string,
  tag: FunctionComponent,
  hash: string,
  deps: any[]
) {
  if (kAlienComponentKey.in(tag)) {
    const name = (tag as any).displayName || tag.name || '<anonymous>'
    return console.error(
      `[HMR] Component "${name}" cannot be immediately used within the same module it was defined in. Either use "queueMicrotask" or import the component from another module.`
    )
  }

  // Keep the original component around, so it can be used by parent
  // components to update the new component instance.
  let [renderRef, oldHash, oldDeps] = componentRegistry[key] || []

  if (renderRef) {
    const needsHotUpdate =
      (oldHash != null && oldHash !== hash) ||
      (oldDeps != null && depsHaveChanged(deps, oldDeps))

    if (needsHotUpdate) {
      renderRef.value = tag
    }
  } else {
    renderRef = ref(tag)
  }

  kAlienComponentKey(tag, key)
  componentRegistry[key] = [renderRef, hash, deps]
  attachRef(tag, kAlienRenderFunc.symbol, renderRef)
}

setComponentRenderHook(component => {
  // If no component key exists, the component was never registered for hot
  // updates, which means it's either not a top-level component or it was
  // immediately used in the same module it was declared in.
  if (!kAlienComponentKey.in(component.tag)) {
    return component.tag
  }

  // This access is what subscribes the component to hot updates.
  const render = kAlienRenderFunc(component.tag)!

  // Track which render function was last used by each component instance.
  const prevRender = kAlienRenderFunc(component)

  let isHotUpdate: boolean | undefined
  if (render !== prevRender) {
    kAlienRenderFunc(component, render)

    // If the component is being hot-updated, clear any memoized values and
    // disposable hooks (except for initializer hooks).
    if (prevRender) {
      isHotUpdate = true
      component.memos = null
      component.hooks.forEach((hook, index, hooks) => {
        if (hook?.dispose) {
          if (isArray(hook.deps) && !hook.deps.length) {
            return // Skip one-time effects.
          }
          if (isFunction(hook.dispose)) {
            hook.dispose()
          }
          hooks[index] = undefined
        }
      })
    }
  }

  return props => {
    try {
      return render(props)
    } catch (e: any) {
      // If rendering fails, try clearing persistent hook state.
      if (isHotUpdate) {
        component.truncate(0)
        component.scheduleUpdate()
      }
      throw e
    }
  }
})
