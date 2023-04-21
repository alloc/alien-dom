import { AlienHooks } from './hooks'
import { AlienComponent } from './internal/component'
import { createStack } from './internal/stack'
import { ElementMode } from './internal/types'

export const currentHooks = createStack<AlienHooks>()
export const currentComponent = createStack<AlienComponent>()
export const currentMode = createStack<ElementMode>('noop')
