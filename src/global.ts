import type { AlienEffectContext } from './effects'
import type { AlienComponent } from './internal/component'
import type { ElementMode } from './internal/types'
import type { AnimatedElement } from './internal/animate/types'
import { createStack } from './internal/stack'

export const currentEffects = createStack<AlienEffectContext>()
export const currentComponent = createStack<AlienComponent>()
export const currentMode = createStack<ElementMode>('noop')

export const animatedElements = new WeakMap<Element, AnimatedElement>()
