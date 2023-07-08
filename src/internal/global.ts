import type { AlienEffects } from '../effects'
import type { AnimatedElement } from './animate/types'
import type { AlienComponent } from './component'
import { createStack } from './stack'
import type { DefaultElement, ElementMode } from './types'

export const currentEffects = createStack<AlienEffects>()
export const currentComponent = createStack<AlienComponent>()
export const currentMode = createStack<ElementMode>('noop')

export const animatedElements = new Map<DefaultElement, AnimatedElement>()
