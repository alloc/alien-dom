import { isArray, isFunction } from '@alloc/is'
import { attachRef } from './functions/attachRef'
import { depsHaveChanged } from './functions/depsHaveChanged'
import { expectCurrentComponent } from './internal/global'
import { selfUpdating } from './internal/selfUpdating'
import { createSymbolProperty } from './internal/symbolProperty'
import { kAlienRenderFunc } from './internal/symbols'
import { Ref, ref } from './observable'
import type { FunctionComponent } from './types/component'
import type { JSX } from './types/jsx'

const kAlienComponentKey = createSymbolProperty<string>('componentKey')

type HotComponent = [
  component: Ref<(props: any) => any>,
  hash: string,
  deps: any[]
]

const componentRegistry: { [key: string]: HotComponent } = {}

export function hmrRegister(
  file: string,
  name: string,
  newComponent: FunctionComponent,
  hash: string,
  deps: any[]
) {
  const key = file + ':' + name
  kAlienComponentKey(newComponent, key)

  // Keep the original component around, so it can be used by parent
  // components to update the new component instance.
  let [renderRef, oldHash, oldDeps] = componentRegistry[key] || []

  const newRender = kAlienRenderFunc(newComponent)!
  if (renderRef) {
    const needsHotUpdate =
      (oldHash != null && oldHash !== hash) ||
      (oldDeps != null && depsHaveChanged(deps, oldDeps))

    if (needsHotUpdate) {
      renderRef.value = newRender
    }
  } else {
    renderRef = ref(newRender)
  }

  componentRegistry[key] = [renderRef, hash, deps]
  attachRef(newComponent, kAlienRenderFunc.symbol, renderRef)
}

export function hmrSelfUpdating(render: (props: any) => JSX.Element) {
  const Component = selfUpdating(props => {
    if (kAlienComponentKey(Component) == null) {
      console.error(
        `[HMR] Component cannot be immediately used within the same module it was defined in. Either use "queueMicrotask" or import the component from another module.`
      )
      return null
    }

    // This access is what subscribes the component to hot updates.
    const render = kAlienRenderFunc(Component) as (props: any) => JSX.Element

    // Track which render function was last used by each component instance.
    const component = expectCurrentComponent()
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

    try {
      return render(props)
    } catch (e: any) {
      // If rendering fails, try clearing persistent hook state.
      if (isHotUpdate) {
        try {
          const component = expectCurrentComponent()
          component.truncate(0)

          return render(props)
        } catch {}
      }
      console.error(e)
      return null
    }
  })

  // Make the raw component available to hmrRegister, so it can update older
  // instances of the same component. Once that's done, the raw component is
  // replaced with a reference to the latest revision.
  kAlienRenderFunc(Component, render)

  return Component
}
