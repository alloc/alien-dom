import { AlienComponent } from '../internal/component'
import { expectCurrentComponent } from '../internal/global'
import { useState } from './useState'

export function useForceUpdate() {
  const component = expectCurrentComponent()
  return useState(getForceUpdate, component)
}

const getForceUpdate = (component: AlienComponent) =>
  component.update.bind(component)
