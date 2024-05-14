import { createContext } from '../core/context'
import { expectCurrentComponent } from './global'

export const ShadowRootContext = createContext<ShadowRoot | undefined>()
export const getShadowRoot = () =>
  expectCurrentComponent().context.get(ShadowRootContext)?.value
