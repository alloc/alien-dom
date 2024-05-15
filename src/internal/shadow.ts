import { defineContext } from '../core/context'
import { expectCurrentComponent } from './global'

export const ShadowRootContext = defineContext<ShadowRoot | undefined>()
export const getShadowRoot = () =>
  expectCurrentComponent().context.get(ShadowRootContext)?.value
