import type { AlienEffects } from '../core/effects'
import type { AlienRunningComponent } from './component'
import type { NodeStore } from './nodeStore'
import { expectLastValue, type Stack } from './stack'

export const currentEffects: Stack<AlienEffects> = [null]
export const currentComponent: Stack<AlienRunningComponent> = [null]
export const currentNodeStore: Stack<NodeStore> = [null]

export const expectCurrentEffects = /** @__PURE__ */ expectLastValue(
  currentEffects,
  'Effects context not found'
)

export const expectCurrentComponent = expectLastValue(
  currentComponent,
  'Component instance not found'
)
