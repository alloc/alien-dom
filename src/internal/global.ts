import type { AlienEffects } from '../core/effects'
import type { AnimatedElement } from './animate/types'
import type { AlienRunningComponent } from './component'
import type { NodeStore } from './nodeStore'
import { expectLastValue, type Stack } from './stack'
import type { HTMLOrSVGElement } from './types'

export const animatedElements = new Map<HTMLOrSVGElement, AnimatedElement>()

export const currentEffects: Stack<AlienEffects> = [null]
export const currentComponent: Stack<AlienRunningComponent> = [null]
export const currentNodeStore: Stack<NodeStore> = [null]

export const expectCurrentEffects = expectLastValue(
  currentEffects,
  'Effects context not found'
)

export const expectCurrentComponent = expectLastValue(
  currentComponent,
  'Component instance not found'
)
