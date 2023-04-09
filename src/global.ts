import { AlienHooks } from './hooks'
import { AlienComponent } from './internal/component'
import { createStack } from './internal/stack'

export const currentHooks = createStack<AlienHooks | undefined>()
export const currentComponent = createStack<AlienComponent | undefined>()
