import { isFunction, isArray } from '@alloc/is'
import type { JSX } from './types/jsx'
import type { FunctionComponent } from './types/component'
import { selfUpdating } from './functions/selfUpdating'
import { jsx } from './jsx-dom/jsx-runtime'
import { currentComponent } from './internal/global'
import { kAlienRenderFunc } from './internal/symbols'
import { createSymbolProperty } from './internal/symbolProperty'
import { AlienComponent } from './internal/component'
import { isFragment } from './internal/duck'
import { ref } from './observable'
import { attachRef } from './functions/attachRef'

const kAlienComponentKey = createSymbolProperty<string>('componentKey')
const kAlienHotUpdate = createSymbolProperty<boolean>('hotUpdate')

export function hmrSelfUpdating(render: (props: any) => JSX.Element) {
  const renderRef = ref(render)
  const Component = selfUpdating(props => {
    const component = currentComponent.get()
    const render = renderRef.value
    const result = hmrRender(component, render, props)

    registerComponent(Component)
    return result
  })
  attachRef(Component, kAlienRenderFunc.symbol, renderRef)
  return Component
}

export function hmrComponent(render: (props: any) => JSX.Element) {
  const renderRef = ref(render)
  const Component = (props: any) => {
    const component = currentComponent.get()
    const render = renderRef.value
    const result = hmrRender(component, render, props)

    // Elements are only registered when this component isn't used by a
    // self-updating ancestor, since this component will be made
    // self-updating in that case.
    if (!component) {
      registerElements(result, Component, props)
    }

    registerComponent(Component)
    return result
  }
  attachRef(Component, kAlienRenderFunc.symbol, renderRef, () => {
    const instances = instanceRegistry.get(Component)
    if (!instances) {
      return
    }

    const oldInstances = [...instances]
    instances.clear()

    for (const oldInstance of oldInstances) {
      const oldElements = oldInstance.elements.filter(
        element => element.isConnected
      )
      if (!oldElements.length) {
        continue
      }
      const result = jsx(Component, oldInstance.props)
      oldElements.forEach((element, i) => {
        if (i === 0 && result !== null) {
          element.replaceWith(result)
        } else {
          element.remove()
        }
      })
    }
  })
  return Component
}

function hmrRender(
  component: AlienComponent | null,
  render: (props: any) => JSX.Element,
  props: any
): JSX.Element | null

function hmrRender(
  component: AlienComponent | null,
  render: (props: any, update: any) => JSX.Element,
  props: any,
  update: any
): JSX.Element | null

function hmrRender(
  component: AlienComponent | null,
  render: (props: any, update?: any) => JSX.Element,
  props: any,
  update?: any
): JSX.Element | null {
  if (!component) {
    return render(props, update)
  }
  if (kAlienHotUpdate.in(render)) {
    clearMemoized(component)
  }
  try {
    return render(props, update)
  } catch (e: any) {
    // If rendering fails, try resetting the hook state.
    try {
      component.truncate(0)
      return render(props, update)
    } catch (e: any) {
      // If rendering still fails, return null.
      console.error(e)
      return null
    }
  }
}

function clearMemoized(component: AlienComponent) {
  component.memos = null
  component.hooks.forEach((hook, index, hooks) => {
    if (hook && hook.hasOwnProperty('dispose')) {
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
      const oldComponents = [...components]
      components.clear()
      oldComponents.forEach(oldComponent => {
        const newRender = kAlienRenderFunc(component)
        kAlienHotUpdate(newRender, true)
        Reflect.set(oldComponent, kAlienRenderFunc.symbol, newRender)
      })
    })
  }
}

function registerComponent(component: FunctionComponent) {
  const key = kAlienComponentKey(component)!
  const [components] = componentRegistry[key]
  components.add(component)
}

type ComponentInstance = {
  elements: JSX.Element[]
  props: object
}

const instanceRegistry = new Map<FunctionComponent, Set<ComponentInstance>>()

function registerElements(
  element: JSX.Element | null,
  component: FunctionComponent,
  props: object
) {
  let instances = instanceRegistry.get(component)
  if (!instances) {
    instances = new Set()
    instanceRegistry.set(component, instances)
  }

  const instance: ComponentInstance = { elements: [], props }
  instances.add(instance)

  if (element) {
    if (isFragment(element)) {
      registerFragment(element, instance)
    } else {
      instance.elements.push(element)
    }
  }
}

function registerFragment(
  fragment: JSX.Element | DocumentFragment,
  instance: ComponentInstance
) {
  fragment.childNodes.forEach(child => {
    if (isFragment(child)) {
      registerFragment(child, instance)
    } else {
      instance.elements.push(child as JSX.Element)
    }
  })
}
