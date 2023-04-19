import type { JSX } from './types/jsx'
import type { FunctionComponent } from './types/component'
import { selfUpdating } from './selfUpdating'
import { ref, attachRef } from './signals'
import { jsx } from './jsx-dom/jsx'
import { currentComponent } from './global'
import { setSymbol } from './symbols'

const kAlienRenderFunc = Symbol('alien:renderFunc')
const kAlienComponentKey = Symbol('alien:componentKey')

export function hmrSelfUpdating(
  render: (props: any, update: (props: any) => void) => JSX.Element
) {
  const renderRef = ref(render)
  const Component = selfUpdating((props, update) => {
    const render = renderRef.value
    return render(props, update)
  })
  attachRef(Component, kAlienRenderFunc, renderRef)
  return Component
}

export function hmrComponent(render: (props: any) => JSX.Element) {
  const renderRef = ref(render)
  const Component = (props: any) => {
    const render = renderRef.value
    const result = render(props)
    if (!currentComponent.get()) {
      registerElements(result, Component, props)
    }
    return result
  }
  attachRef(Component, kAlienRenderFunc, renderRef, () => {
    const instances = instanceRegistry.get(Component)
    if (!instances) {
      return
    }

    const oldInstances = [...instances]
    instances.clear()

    for (const oldInstance of oldInstances) {
      const oldElements = oldInstance.elements.filter(element =>
        document.body.contains(element)
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
  setSymbol(component, kAlienComponentKey, key)

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
          kAlienRenderFunc,
          (component as any)[kAlienRenderFunc]
        )
      })
    })
  }
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
    if (element.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      registerFragment(element, instance)
    } else {
      instance.elements.push(element)
    }
  }

  const key = (component as any)[kAlienComponentKey]
  const [components] = componentRegistry[key]
  components.add(component)
}

function registerFragment(fragment: JSX.Element, instance: ComponentInstance) {
  fragment.childNodes.forEach(child => {
    if (child.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      registerFragment(child as JSX.Element, instance)
    } else {
      instance.elements.push(child as JSX.Element)
    }
  })
}
