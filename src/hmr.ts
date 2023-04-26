import type { JSX } from './types/jsx'
import type { FunctionComponent } from './types/component'
import { selfUpdating } from './functions/selfUpdating'
import { ref, attachRef } from './signals'
import { jsx } from './jsx-dom/jsx-runtime'
import { currentComponent } from './internal/global'
import { createSymbol, kAlienRenderFunc } from './internal/symbols'
import { kFragmentNodeType } from './internal/constants'

const kAlienComponentKey = createSymbol<string>('componentKey')

export function hmrSelfUpdating(
  render: (props: any, update: (props: any) => void) => JSX.Element
) {
  const renderRef = ref(render)
  const Component = selfUpdating((props, update) => {
    const render = renderRef.value
    const result = render(props, update)
    registerComponent(Component)
    return result
  })
  attachRef(Component, kAlienRenderFunc.symbol, renderRef)
  return Component
}

export function hmrComponent(render: (props: any) => JSX.Element) {
  const renderRef = ref(render)
  const Component = (props: any) => {
    const render = renderRef.value
    const result = render(props)

    // Elements are only registered when this component isn't used by a
    // self-updating ancestor, since this component will be made
    // self-updating in that case.
    if (!currentComponent.get()) {
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
        Reflect.set(
          oldComponent,
          kAlienRenderFunc.symbol,
          kAlienRenderFunc(component)
        )
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
    if (element.nodeType === kFragmentNodeType) {
      registerFragment(element, instance)
    } else {
      instance.elements.push(element)
    }
  }
}

function registerFragment(fragment: JSX.Element, instance: ComponentInstance) {
  fragment.childNodes.forEach(child => {
    if (child.nodeType === kFragmentNodeType) {
      registerFragment(child as JSX.Element, instance)
    } else {
      instance.elements.push(child as JSX.Element)
    }
  })
}
