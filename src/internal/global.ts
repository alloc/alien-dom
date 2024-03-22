import type { AlienEffects } from '../core/effects'
import type { AnimatedElement } from './animate/types'
import type { AlienRunningComponent } from './component'
import { expectLastValue, type Stack } from './stack'
import type { DefaultElement } from './types'

export const animatedElements = new Map<DefaultElement, AnimatedElement>()

export const currentEffects: Stack<AlienEffects> = [null]
export const expectCurrentEffects = expectLastValue(
  currentEffects,
  'Effects context not found'
)

export const currentComponent: Stack<AlienRunningComponent> = [null]
export const expectCurrentComponent = expectLastValue(
  currentComponent,
  'Component context not found'
)
