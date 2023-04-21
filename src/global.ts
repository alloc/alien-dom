import { AlienHooks } from './hooks'
import { AlienComponent } from './internal/component'
import { createStack } from './internal/stack'
import { ElementMode } from './internal/types'

export const currentHooks = createStack<AlienHooks | undefined>()
export const currentComponent = createStack<AlienComponent | undefined>()
export const currentMode = createStack<ElementMode>('noop')
