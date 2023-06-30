import type { AlienEffects } from '../effects'
import type { AlienComponent } from './component'
import type { DefaultElement, ElementMode } from './types'
import type { AnimatedElement } from './animate/types'
import { createStack } from './stack'

export const currentEffects = createStack<AlienEffects>()
export const currentComponent = createStack<AlienComponent>()
export const currentMode = createStack<ElementMode>('noop')

export const animatedElements = new Map<DefaultElement, AnimatedElement>()
