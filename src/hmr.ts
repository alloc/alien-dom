import { isArray, isFunction } from '@alloc/is'
import { Ref, ref } from './core/observable'
import { attachRef } from './functions/attachRef'
import { depsHaveChanged } from './functions/depsHaveChanged'
import { setComponentRenderHook } from './internal/component'
import {
  definePrivateSymbol,
  getPrivate,
  hasPrivate,
  setPrivate,
} from './internal/privateSymbol'
import { kAlienRenderFunc } from './internal/symbols'

const kAlienComponentKey = definePrivateSymbol<string>('componentKey')

type Component = (props: any) => JSX.ChildrenProp
type ComponentData = [component: Ref<Component>, hash: string, deps: any[]]

const componentRegistry: { [key: string]: ComponentData } = {}
const usedBeforeRegister = new WeakSet<Component>()

export function hmrRegister(
  key: string,
  tag: Component,
  hash: string,
  deps: any[]
) {
  if (usedBeforeRegister.has(tag)) {
    const name = (tag as any).displayName || tag.name || '<anonymous>'
    return console.error(
      `[HMR] Component "${name}" cannot be immediately used within the same module it was defined in. Either use "queueMicrotask" or import the component from another module.`
    )
  }

  // Keep the original component around, so it can be used by parent
  // components to update the new component instance.
  let [renderRef, oldHash, oldDeps] = componentRegistry[key] || []
  const needsUpdateCheck = renderRef != null
  renderRef ||= ref(tag)

  // Hot-reloaded components in the `deps` list are mapped to their component
  // key. Wait until the next microtask before mapping them, or else a
  // hot-reloaded component declared in the same module may not have its
  // component key yet.
  const componentData: ComponentData = [renderRef, hash, deps]
  queueMicrotask(() => {
    componentData[2] = deps = deps.map(
      dep => dep && (getPrivate(dep, kAlienComponentKey) ?? dep)
    )

    if (needsUpdateCheck) {
      const needsHotUpdate =
        (oldHash != null && oldHash !== hash) ||
        (oldDeps != null && depsHaveChanged(deps, oldDeps))

      if (needsHotUpdate) {
        renderRef.value = tag
      }
    }
  })

  setPrivate(tag, kAlienComponentKey, key)
  componentRegistry[key] = componentData
  attachRef(tag, kAlienRenderFunc, renderRef)
}

setComponentRenderHook(component => {
  // If no component key exists, the component was never registered for hot
  // updates, which means it's either not a top-level component or it was
  // immediately used in the same module it was declared in.
  if (!hasPrivate(component.tag, kAlienComponentKey)) {
    usedBeforeRegister.add(component.tag)
    return component.tag
  }

  // This access is what subscribes the component to hot updates.
  const render = getPrivate(component.tag, kAlienRenderFunc)!

  // Track which render function was last used by each component instance.
  const prevRender = getPrivate(component, kAlienRenderFunc)

  let isHotUpdate: boolean | undefined
  if (render !== prevRender) {
    setPrivate(component, kAlienRenderFunc, render)

    // If the component is being hot-updated, clear any memoized values and
    // disposable hooks (except for initializer hooks).
    if (prevRender) {
      isHotUpdate = true
      component.memos?.forEach((memo, key, memos) => {
        // Avoid resetting a nested component's state.
        if (memo && memo.constructor.name === 'NestedTag') return
        // Forget everything else.
        memos.delete(key)
      })
      component.hooks.forEach((hook, index, hooks) => {
        if (hook?.dispose) {
          if (isArray(hook.deps) && !hook.deps.length) {
            return // Skip one-time effects.
          }
          if (isFunction(hook.dispose)) {
            hook.dispose({ isHotReload: true })
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
