import { AlienComponent } from '../internal/component'
import { expectCurrentComponent } from '../internal/global'
import { useConst } from './useConst'

export function useForceUpdate() {
  const component = expectCurrentComponent()
  return useConst(getForceUpdate, component)
}

const getForceUpdate = (component: AlienComponent) =>
  component.update.bind(component)
