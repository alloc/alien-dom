import { currentComponent } from '../internal/global'
import { AlienComponent } from '../internal/component'
import { useState } from './useState'

export function useForceUpdate() {
  const component = currentComponent.get()!
  return useState(getForceUpdate, component)
}

const getForceUpdate = (component: AlienComponent) =>
  component.update.bind(component)
