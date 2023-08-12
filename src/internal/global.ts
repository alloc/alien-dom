import type { AlienEffects } from '../effects'
import type { AnimatedElement } from './animate/types'
import type { AlienRunningComponent } from './component'
import { createStack } from './stack'
import type { DefaultElement, ElementMode } from './types'

export const currentEffects = createStack<AlienEffects>()
export const currentComponent = createStack<AlienRunningComponent | null>()
export const currentMode = createStack<ElementMode>('noop')

export const animatedElements = new Map<DefaultElement, AnimatedElement>()
