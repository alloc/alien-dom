import { isArray, isFunction } from '@alloc/is'
import { attachRef } from './functions/attachRef'
import { selfUpdating } from './functions/selfUpdating'
import { AlienComponent } from './internal/component'
import { currentComponent } from './internal/global'
import { createSymbolProperty } from './internal/symbolProperty'
import { kAlienRenderFunc } from './internal/symbols'
import { ref } from './observable'
import type { FunctionComponent } from './types/component'
import type { JSX } from './types/jsx'

const kAlienComponentKey = createSymbolProperty<string>('componentKey')
const kAlienHotUpdate = createSymbolProperty<boolean>('hotUpdate')

const componentRegistry: {
  [key: string]: [component: Set<FunctionComponent>, hash: string]
} = {}

export function hmrRegister(
  file: string,
  name: string,
  component: FunctionComponent,
  hash: string
) {
  const key = file + ':' + name
  kAlienComponentKey(component, key)

  // Keep the original component around, so it can be used by parent
  // components to update the new component instance.
  const [components, oldHash] = componentRegistry[key] || [new Set()]
  componentRegistry[key] = [components, hash]

  if (oldHash && oldHash !== hash) {
    // Postpone updates until all `hmrRegister` calls have been made.
    queueMicrotask(() => {
      // Any old components that are still mounted will re-add
      // themselves to the component registry when re-rendered.
      let oldComponents = [...components]
      components.clear()

      let i = 0
      let deadline = Date.now() + 32

      const update = () => {
        const oldComponent = oldComponents[i]
        const newRender = kAlienRenderFunc(component)
        kAlienHotUpdate(newRender, true)
        Reflect.set(oldComponent, kAlienRenderFunc.symbol, newRender)
        if (++i === oldComponents.length) {
          console.info(
            `[HMR] ${name} component updated (${i}/${oldComponents.length})`
          )
        } else if (deadline < Date.now()) {
          console.info(
            `[HMR] ${name} component updated (${i}/${oldComponents.length})`
          )
          setTimeout(() => {
            deadline = Date.now() + 32
            update()
          }, 1)
        } else {
          update()
        }
      }

      update()
    })
  }
}

export function hmrSelfUpdating(render: (props: any) => JSX.Element) {
  const renderRef = ref(render)
  const Component = selfUpdating(props => {
    registerComponent(Component)
    return hmrRender(renderRef.value, props)
  })
  attachRef(Component, kAlienRenderFunc.symbol, renderRef)
  return Component
}

function registerComponent(component: FunctionComponent, isRetry?: boolean) {
  const key = kAlienComponentKey(component)
  if (key == null) {
    if (isRetry) {
      throw Error('Component was never passed to hmrRegister')
    }
    queueMicrotask(() => registerComponent(component, true))
  } else {
    const [components] = componentRegistry[key]
    components.add(component)
  }
}

function hmrRender(
  render: (props: any) => JSX.Element,
  props: any
): JSX.Element | null

function hmrRender(
  render: (props: any, update: any) => JSX.Element,
  props: any,
  update: any
): JSX.Element | null

function hmrRender(
  render: (props: any, update?: any) => JSX.Element,
  props: any,
  update?: any
): JSX.Element | null {
  const component = currentComponent.get()
  if (!component) {
    console.warn('hmrRender failed unexpectedly')
    return null
  }
  const isHotUpdate = kAlienHotUpdate(render)
  if (isHotUpdate) {
    kAlienHotUpdate(render, false)
    clearMemoized(component)
  }
  try {
    return render(props, update)
  } catch (e: any) {
    // If rendering fails, try resetting the hook state.
    if (isHotUpdate) {
      try {
        component.truncate(0)
        return render(props, update)
      } catch {}
    }
    console.error(e)
    return null
  }
}

function clearMemoized(component: AlienComponent) {
  component.memos = null
  component.hooks.forEach((hook, index, hooks) => {
    if (hook?.dispose) {
      if (isArray(hook.deps) && !hook.deps.length) {
        return // Skip mount effects.
      }
      if (isFunction(hook.dispose)) {
        hook.dispose()
      }
      hooks[index] = undefined
    }
  })
}
