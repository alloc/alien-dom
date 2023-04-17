import type { JSX } from './types/jsx'
import type { AlienComponent } from './internal/component'
import type { FunctionComponent } from './types/component'
import { selfUpdating } from './selfUpdating'
import { ref, attachRef } from './signals'
import { jsx } from './jsx-dom/jsx'
import { currentComponent } from './global'

const kAlienRenderFunc = Symbol('alien:renderFunc')

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
      // If the "state" property exists, this component was called by a
      // self-updating parent, which means the assignment to `renderRef`
      // will be enough to update this component.
      if (oldInstance.state) {
        continue
      }
      const result = jsx(Component, oldInstance.props)
      oldInstance.elements.forEach((element, i) => {
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
  [key: string]: [component: FunctionComponent, hash: string]
} = {}

export function hmrRegister(
  file: string,
  name: string,
  component: FunctionComponent,
  hash: string
) {
  const key = file + ':' + name
  const [oldComponent, oldHash] = componentRegistry[key] || []

  // Keep the original component around, so it can be used by parent
  // components to update the new component instance.
  componentRegistry[key] = [oldComponent || component, hash]

  console.log('hmrRegister:', {
    file,
    name,
    component,
    hash,
    oldComponent,
    oldHash,
  })

  if (oldHash && oldHash !== hash) {
    Reflect.set(
      oldComponent,
      kAlienRenderFunc,
      (component as any)[kAlienRenderFunc]
    )
  }
}

type ComponentInstance = {
  elements: JSX.Element[]
  props: object
  state?: AlienComponent | null
}

const instanceRegistry = new Map<FunctionComponent, Set<ComponentInstance>>()

function registerElements(
  element: JSX.Element | null,
  Component: FunctionComponent,
  props: object
) {
  let instances = instanceRegistry.get(Component)
  if (!instances) {
    instances = new Set()
    instanceRegistry.set(Component, instances)
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
