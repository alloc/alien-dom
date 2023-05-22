import type { Color } from 'linear-color'
import type { AnimatedTransform } from './transform'
import type {
  FrameCallback,
  StepAnimation,
  StepAnimationFn,
  SpringAnimation,
  SpringConfig,
} from '../../animate'

export type ParsedValue = [number, string]
export type ParsedTransform = [string, ParsedValue[]][]
export type AnimatedType = Color | ParsedValue

/** The animation state of a single property. */
export type AnimatedNode<T extends AnimatedType = AnimatedType> = {
  to: T
  from: T | null
  done: boolean
  v0: number
  lastVelocity: number | null
  lastPosition: number | null
  isRelative: boolean
  transformFn: string | null
  spring: ResolvedSpringConfig
  frame: Record<string, any> | null
  onChange: FrameCallback<any> | null
  onRest: FrameCallback<any> | null
}

export type AnimatedElement = {
  svgMode: boolean
  nodes: { [key: string]: AnimatedNode<AnimatedType> } | null
  step: StepAnimationFn | null
  frame: StepAnimation | null
  timelines: { [prop: string]: SpringTimeline } | null
  transform: AnimatedTransform | null
  anchor: readonly [number, number] | null
  /**
   * This contains the most recent values applied by an animation.
   *
   * The keys are the animated CSS properties.
   */
  style: Record<string, any>
  onStart: (() => void) | null
}

export type SpringTimeline = (SpringAnimation & {
  timerId?: number
  abortCtrl?: AbortController
})[]

export type ResolvedSpringConfig = SpringConfig & {
  tension: number
  friction: number
  mass: number
}
