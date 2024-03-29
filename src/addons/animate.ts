import { isBoolean, isFunction, isNumber, isPromise } from '@alloc/is'
import { Any, Falsy } from '@alloc/types'
import { Color, mixColor, parseColor } from 'linear-color'
import {
  applyAnimatedValue,
  deleteTimeline,
  kAlienAnimatedState,
} from '../internal/animate'
import { parseValue } from '../internal/animate/parseValue'
import {
  AnimatedTransform,
  resolveTransformFn,
} from '../internal/animate/transform'
import {
  AnimatedElement,
  AnimatedNode,
  ParsedValue,
  ResolvedSpringConfig,
  SpringTimeline,
} from '../internal/animate/types'
import { animatedElements } from '../internal/global'
import { cssTransformDefaults, cssTransformUnits } from '../internal/transform'
import {
  AnyElement,
  DefaultElement,
  Length,
  TransformAttributes,
} from '../internal/types'
import { keys, toArray } from '../internal/util'
import { isSvgChild } from '../jsx-dom/svg-tags'
import { $$, AlienSelector } from './selectors'

export type SpringAnimation<
  Element extends AnyElement = any,
  Props extends object = AnimatedProps<Element>
> = {
  to?: Props | Falsy
  from?: Props | Falsy
  spring?: SpringConfigOption<Props>
  velocity?: number | { [K in keyof Props]?: number }
  delay?: SpringDelay | { [K in keyof Props]?: SpringDelay }
  immediate?: boolean | { [K in keyof Props]?: boolean }
  dilate?: number
  anchor?: [number, number]
  onStart?: (target: Element) => void
  onChange?: FrameCallback<Element, Props>
  onRest?: FrameCallback<Element, Props>
}

export type SpringDelay = number | SpringDelayFn | Promise<unknown>
export type SpringDelayFn = (
  signal: AbortSignal,
  key: string
) => Promise<unknown> | null | void

export type FrameCallback<
  T extends AnyElement,
  Props extends object = AnimatedProps<T>
> = (props: [T] extends [Any] ? any : Required<Props>, target: T) => void

export type StepAnimationFn<
  Element extends AnyElement = any,
  Props extends object = AnimatedProps<Element>
> = (frame: StepAnimation<Element, Props>) => Props | null

export type StepAnimation<
  Element extends AnyElement = any,
  Props extends object = AnimatedProps<Element>
> = {
  target: Element
  /** When true, the animation ends. */
  done: boolean
  /** When the animation started as a `requestAnimationFrame` timestamp. */
  t0: number
  /** Milliseconds since the previous frame. */
  dt: number
  /** Time of the current frame as a `requestAnimationFrame` timestamp. */
  time: number
  /** Milliseconds since the animation started. */
  duration: number
  /** An accumulation of frames since the animation started. */
  current: Props
  /**
   * If multiple targets exist for the same animation, this is the
   * target index for the current `target`.
   */
  index: number
}

export type SpringConfigOption<Props> =
  | ((key: KeyArgument<Props>) => SpringConfig | Falsy)
  | SpringConfig
  | Falsy

export type SpringConfig = {
  frequency?: number
  damping?: number
  tension?: number
  friction?: number
  mass?: number
  bounce?: number
  clamp?: boolean
  restVelocity?: number
}

export interface HTMLAnimatedProps extends TransformAttributes {
  backgroundColor?: string
  borderRadius?: Length
  color?: string
  opacity?: number
}

export interface SVGAnimatedProps extends TransformAttributes {
  fill?: string
  fillOpacity?: number
  stroke?: string
  strokeWidth?: number
  strokeOpacity?: number
  opacity?: number
  rx?: Length
  ry?: Length
  width?: Length
  height?: Length
  // Circle props
  r?: Length
  cx?: Length
  cy?: Length
}

export type AnimatedProps<T extends AnyElement> = [T] extends [Any]
  ? any
  : T extends HTMLElement
  ? HTMLAnimatedProps
  : T extends SVGElement
  ? SVGAnimatedProps
  : never

export type AnimatedProp<T extends AnyElement> = string & keyof AnimatedProps<T>

type KeyArgument<T> = [T] extends [Any] ? any : keyof T

type OneOrMany<T> = T | readonly T[]

export type AnimationsParam<
  Element extends AnyElement = any,
  Props extends object = AnimatedProps<Element>
> = OneOrMany<SpringAnimation<Element, Props>> | StepAnimationFn<Element, Props>

export function animate(
  elements: OneOrMany<HTMLElement> | NodeListOf<HTMLElement>,
  animations: AnimationsParam<HTMLElement>
): void

export function animate(
  elements: OneOrMany<SVGElement> | NodeListOf<SVGElement>,
  animations: AnimationsParam<SVGElement>
): void

export function animate(
  selector: AlienSelector,
  animations: AnimationsParam<DefaultElement>
): void

export function animate(
  selector: AlienSelector | readonly AnyElement[],
  _animations: AnimationsParam<any>
) {
  const targets = $$<HTMLElement>(selector)

  if (isFunction(_animations)) {
    const step = _animations
    if (targets.length) {
      targets.forEach((target, index) => {
        const state = ensureAnimatedElement(target)
        state.step = step
        state.frame = {
          target,
          done: false,
          t0: 0,
          dt: 0,
          time: 0,
          duration: 0,
          current: {},
          index,
        }
        animatedElements.set(target, state)
      })

      startLoop()
    }
  } else {
    const animations = toArray(_animations)
    const springs = animations.map(animation =>
      toSpringResolver(animation.spring)
    )
    targets.forEach(target => {
      let timelines: Record<string, SpringTimeline> | undefined
      let state = ensureAnimatedElement(target)
      state.nodes ||= {}

      // Any defined keys will be removed from the previous timelines object.
      const definedKeys = new Set<string>()

      animations.forEach((animation, i) => {
        let keys = Object.keys({
          ...animation.to,
          ...animation.from,
        }) as AnimatedProp<any>[]

        keys.forEach(key => {
          const to = animation.to?.[key]
          const from = animation.from != null ? animation.from[key] : null
          if (to != null || from != null) {
            definedKeys.add(key)
          }
        })

        if (animation.delay) {
          const { delay } = animation
          if (isNumber(delay)) {
            if (delay > 0) {
              keys.forEach(key => {
                timelines = addTimelineTimeout(
                  timelines,
                  target,
                  state,
                  animation,
                  springs[i],
                  delay,
                  key
                )
              })
              keys.length = 0
            }
          } else if (isFunction(delay) || isPromise(delay)) {
            keys.forEach(key => {
              timelines = addTimelinePromise(
                timelines,
                target,
                state,
                animation,
                springs[i],
                delay,
                key
              )
            })
            keys.length = 0
          } else {
            keys = keys.filter(key => {
              const keyDelay = delay[key]
              if (keyDelay) {
                if (isNumber(keyDelay)) {
                  timelines = addTimelineTimeout(
                    timelines,
                    target,
                    state,
                    animation,
                    springs[i],
                    keyDelay,
                    key
                  )
                } else {
                  timelines = addTimelinePromise(
                    timelines,
                    target,
                    state,
                    animation,
                    springs[i],
                    keyDelay,
                    key
                  )
                }
                return false
              }
              return true
            })
          }
        }

        if (keys.length) {
          applyAnimation(target, state, animation, springs[i], keys)
        }
      })

      const oldTimelines = state.timelines
      if (oldTimelines) {
        definedKeys.forEach(key => {
          deleteTimeline(oldTimelines, key)
        })
      }

      if (timelines) {
        state.timelines = { ...oldTimelines, ...timelines }
      }
    })
  }
}

function ensureAnimatedElement(target: DefaultElement): AnimatedElement {
  let state = kAlienAnimatedState(target)
  if (!state) {
    state = {
      svgMode: isSvgChild(target),
      nodes: null,
      step: null,
      frame: null,
      timelines: null,
      transform: null,
      anchor: null,
      style: {},
      onStart: null,
    }
    kAlienAnimatedState(target, state)
  }
  return state
}

function addTimelineTimeout(
  timelines: Record<string, SpringTimeline> | undefined,
  target: HTMLElement,
  state: AnimatedElement,
  animation: SpringAnimation,
  spring: SpringResolver,
  delay: number,
  key: string
) {
  if (delay > 0) {
    const dilation = animation.dilate ?? 1
    const timerId = setTimeout(() => {
      applyAnimation(target, state, animation, spring, [key])
    }, delay * dilation)

    const timeline = ((timelines ||= {})[key] ||= [])
    timeline.push({ ...animation, timerId })
  } else {
    applyAnimation(target, state, animation, spring, [key])
  }
  return timelines
}

function addTimelinePromise(
  timelines: Record<string, SpringTimeline> | undefined,
  target: HTMLElement,
  state: AnimatedElement,
  animation: SpringAnimation,
  spring: SpringResolver,
  delay: SpringDelayFn | Promise<unknown>,
  key: string
) {
  const abortCtrl = new AbortController()
  const promise = isFunction(delay)
    ? delay(abortCtrl.signal, key)
    : Promise.race([
        delay,
        new Promise(resolve =>
          abortCtrl.signal.addEventListener('abort', resolve)
        ),
      ])

  if (promise) {
    const timeline = ((timelines ||= {})[key] ||= [])
    timeline.push({ ...animation, abortCtrl })
    promise.then(() => {
      if (!abortCtrl.signal.aborted) {
        applyAnimation(target, state, animation, spring, [key])
      }
    }, console.error)
  } else {
    applyAnimation(target, state, animation, spring, [key])
  }

  return timelines
}

function applyAnimation(
  target: HTMLElement,
  state: AnimatedElement,
  animation: SpringAnimation,
  spring: SpringResolver,
  keys: AnimatedProp<any>[]
) {
  startLoop()

  const { nodes, svgMode } = state as {
    nodes: Record<string, AnimatedNode>
    svgMode: boolean
  }
  const { onStart, onChange, onRest } = animation
  const frame: Record<string, any> | null = onChange || onRest ? {} : null

  state.anchor =
    animation.anchor ||
    // If an anchor gets unset, we need to reset it to the default.
    (state.anchor && (svgMode ? svgDefaultAnchor : htmlDefaultAnchor))

  state.onStart = onStart || null

  for (const key of keys) {
    const oldNode = nodes[key]
    const node = updateAnimatedNode(
      target,
      svgMode,
      key,
      animation.to?.[key],
      animation.from?.[key],
      oldNode,
      spring,
      animation.dilate,
      !animation.velocity || isNumber(animation.velocity)
        ? animation.velocity
        : animation.velocity[key],
      !animation.immediate || isBoolean(animation.immediate)
        ? animation.immediate
        : animation.immediate[key],
      frame,
      onChange,
      onRest
    )

    if (node && !oldNode) {
      nodes[key] = node

      if (node.transformFn) {
        state.transform ||= new AnimatedTransform(target, svgMode)
      }
    }

    if (node && !node.done) {
      animatedElements.set(target, state)
    }
  }
}

function updateAnimatedNode(
  target: HTMLElement,
  svgMode: boolean,
  key: string,
  to: any,
  from: any,
  node: AnimatedNode | null,
  spring: SpringResolver,
  dilate?: number,
  velocity?: number,
  immediate?: boolean,
  frame?: Record<string, any> | null,
  onChange?: FrameCallback<any>,
  onRest?: FrameCallback<any>
): AnimatedNode | null {
  let parsedFrom: Color | ParsedValue | null
  let parsedTo: Color | ParsedValue | null

  const isColor = isColorKey(key, svgMode)
  if (isColor) {
    parsedFrom =
      from != null
        ? parseColor(resolveCssVariable(from as string, target))
        : null
    parsedTo =
      to != null
        ? parseColor(resolveCssVariable(to as string, target))
        : parsedFrom
  } else {
    const defaultUnit = svgMode ? undefined : defaultUnits[key]
    parsedFrom = from != null ? parseValue(from, defaultUnit) : null
    parsedTo = parseValue(to, defaultUnit) ?? parsedFrom
  }

  if (!parsedTo) {
    return null
  }

  node ||= {
    v0: 0,
    done: false,
    to: parsedTo,
    from: parsedFrom,
    lastPosition: null,
    lastVelocity: null,
    dilation: 1,
    isRelative: false,
    transformFn: resolveTransformFn(key, svgMode),
    spring: null!,
    frame: null,
    onChange: null,
    onRest: null,
  }

  node.done = false
  node.to = parsedTo
  node.from = parsedFrom
  node.spring = spring(key)
  node.frame = frame || null
  node.dilation = dilate ?? 1
  node.onChange = onChange || null
  node.onRest = onRest || null

  if (parsedFrom || isColor) {
    node.lastPosition = null
  }

  if (immediate || velocity != null || isNaN(node.v0)) {
    node.v0 = immediate ? NaN : velocity ?? 0
    node.lastVelocity = null
  }

  if (svgMode && !isColor) {
    node.isRelative =
      scaleKeys.includes(key) ||
      (parsedTo as ParsedValue)[1] == '%' ||
      (!!parsedFrom && (parsedFrom as ParsedValue)[1] == '%')
  }

  return node
}

const htmlDefaultAnchor = [0.5, 0.5] as const
const svgDefaultAnchor = [0, 0] as const

const htmlColorKeys = ['backgroundColor', 'color']
const svgColorKeys = ['fill', 'stroke']

function isColorKey(key: string, svgMode: boolean) {
  return (svgMode ? svgColorKeys : htmlColorKeys).includes(key)
}

const defaultUnits: Record<string, string | undefined> = {
  ...cssTransformUnits,
  borderRadius: 'px',
}

const svgNonZeroDefaults: Record<string, string> = {
  fill: 'rgba(0,0,0,0)',
  fillOpacity: '1',
  stroke: 'rgba(0,0,0,0)',
  strokeOpacity: '1',
  opacity: '1',
}

const scaleKeys = ['scale', 'scaleX', 'scaleY']

let loop: number | undefined
let lastTime: number | undefined

function startLoop() {
  if (loop) return
  loop = requestAnimationFrame(function step(now) {
    const dt = Math.min(64, now - (lastTime || now))
    lastTime = now

    let stepResults: Map<DefaultElement, any> | undefined

    for (const [target, state] of animatedElements) {
      if (!target.isConnected) {
        animatedElements.delete(target)
        continue
      }
      if (state.nodes) {
        // Perform reads before writes for better performance.
        ensureFromValues(target, state, state.nodes)
      }
      if (state.step) {
        const { step, frame } = state as {
          step: StepAnimationFn
          frame: StepAnimation
        }

        frame.t0 ??= now
        frame.dt = dt
        frame.time = now
        frame.duration += dt

        // Calculate the next step before any writes, in case the step
        // function wants to read from its target.
        const stepResult = step(frame)

        stepResults ||= new Map()
        stepResults.set(target, stepResult)
      }
    }

    let loopDone = true

    for (const [target, state] of animatedElements) {
      const { nodes, svgMode, style, onStart } = state

      if (onStart) {
        onStart(target)
        state.onStart = null
      }

      type FrameValue = [string, AnimatedNode<any>]
      const frames = new Map<Record<string, any>, FrameValue[]>()

      if (nodes) {
        for (const [key, node] of Object.entries(nodes)) {
          if (node.done) {
            continue
          }
          // TODO figure out why node.from is sometimes null
          if (node.from == null) {
            continue
          }
          const position = advance(node, node.spring, dt, key)
          if (node.frame) {
            const values = frames.get(node.frame) || []
            frames.set(node.frame, values)
            values.push([key, node])
          }
          const { to } = node
          if (Array.isArray(to)) {
            if (node.transformFn) {
              state.transform!.addCall(key, position, to[1], node.transformFn)
            } else {
              const value = position + to[1]
              applyAnimatedValue(target, style, svgMode, key, value)
            }
          } else {
            const value = mixColor(node.from as Color, to, position)
            applyAnimatedValue(target, style, svgMode, key, value)
          }
        }
      }

      if (state.step) {
        const frame = state.frame!
        const stepResult = stepResults!.get(target)

        if (stepResult) {
          for (const key of keys(stepResult)) {
            const value = stepResult[key]
            if (value !== undefined) {
              frame.current[key] = value
            }

            const transformFn = resolveTransformFn(key, svgMode)
            if (transformFn) {
              const defaultUnit = svgMode ? undefined : defaultUnits[key]
              const parsed = parseValue(value, defaultUnit)
              if (parsed) {
                state.transform ||= new AnimatedTransform(target, svgMode)
                state.transform.addCall(key, parsed[0], parsed[1], transformFn)
              }
            } else {
              applyAnimatedValue(target, null, svgMode, key, value)
            }
          }
        }

        if (frame.done) {
          state.step = null
          state.frame = null
        }
      }

      state.transform?.apply(state)

      for (const [frame, values] of frames) {
        let frameDone = true
        for (const [prop, node] of values) {
          frame[prop] = readValue(node)
          if (!node.done) {
            frameDone = false
          }
        }
        const { onChange, onRest } = values[0][1]
        if (onChange) {
          onChange(frame, target)
        }
        if (onRest && frameDone) {
          onRest(frame, target)
        }
      }

      const done =
        !(state.nodes && Object.values(state.nodes).some(node => !node.done)) &&
        !state.step

      if (done) {
        animatedElements.delete(target)
      } else {
        loopDone = false
      }
    }

    // If the loop is about to stop, we need to check if any animations were
    // scheduled from inside onStart/onChange/onRest callbacks.
    if (loopDone) {
      for (const [, state] of animatedElements) {
        if (state.nodes) {
          const done = Object.values(state.nodes).every(node => node.done)
          if (!done) {
            loopDone = false
            break
          }
        }
        if (state.frame && !state.frame.done) {
          loopDone = false
          break
        }
      }
    }

    if (loopDone) {
      loop = undefined
      lastTime = undefined
    } else {
      loop = requestAnimationFrame(step)
    }
  })
}

function readValue({ lastPosition, from, to }: AnimatedNode) {
  if (lastPosition == null) {
    return undefined
  }
  if (Array.isArray(to)) {
    const unit = to[1]
    if (unit) {
      return lastPosition + unit
    }
    return lastPosition
  }
  return mixColor(from as Color, to, lastPosition)
}

type SpringResolver = (key: string) => ResolvedSpringConfig

const maxPrecision = 0.1 / (window.devicePixelRatio || 1)
const defaultPrecisions: Record<string, number> = {
  opacity: 0.01,
}

function advance(
  node: AnimatedNode,
  config: ResolvedSpringConfig,
  dt: number,
  prop: string
): number {
  let from: number
  let to: number
  if (Array.isArray(node.to)) {
    from = (node.from as ParsedValue)[0]
    to = node.to[0]
  } else {
    from = 0
    to = 1
  }

  if (node.lastPosition == null && node.from == null) {
    return to
  }

  let position = node.lastPosition == null ? from : node.lastPosition
  let velocity = node.lastVelocity == null ? node.v0 : node.lastVelocity
  let finished = false

  const equalFromTo = from == to

  // Immediate animations have no velocity.
  if (isNaN(velocity) || (equalFromTo && velocity === 0)) {
    finished = true
  } else {
    const precision =
      defaultPrecisions[prop] ||
      (equalFromTo
        ? 0.005
        : Math.min(Math.abs(to - from) * 0.001, maxPrecision))

    /** The velocity at which movement is essentially none */
    const restVelocity = config.restVelocity || precision / 10

    // Bouncing is opt-in (not to be confused with overshooting)
    const bounceFactor = config.clamp ? 0 : config.bounce
    const canBounce = bounceFactor !== undefined

    /** When `true`, the value is increasing over time */
    const isGrowing = equalFromTo ? node.v0 > 0 : from < to

    /** When `true`, the velocity is considered moving */
    let isMoving: boolean

    /** When `true`, the velocity is being deflected or clamped */
    let isBouncing = false

    const step = 1 // 1ms
    const stepFactor = 1 / node.dilation
    const numSteps = Math.max(1, Math.ceil(dt / step))

    for (let n = 0; n < numSteps; ++n) {
      isMoving = Math.abs(velocity) > restVelocity

      if (!isMoving) {
        finished = Math.abs(to - position) <= precision
        if (finished) {
          break
        }
      }

      if (canBounce) {
        isBouncing = position == to || position > to == isGrowing

        // Invert the velocity with a magnitude, or clamp it.
        if (isBouncing) {
          velocity = -velocity * bounceFactor
          position = to
        }
      }

      const springForce = -config.tension * 0.000001 * (position - to)
      const dampingForce = -config.friction * 0.001 * velocity
      const acceleration = (springForce + dampingForce) / config.mass // pt/ms^2

      velocity = velocity + acceleration * step * stepFactor // pt/ms
      position = position + velocity * step * stepFactor
    }
  }

  if (finished) {
    node.done = true
    velocity = 0
    position = to
  }

  node.lastVelocity = velocity
  node.lastPosition = position
  return position
}

function toSpringResolver(
  spring: SpringConfig | ((key: string) => SpringConfig | Falsy) | Falsy
) {
  if (!isFunction(spring)) {
    const resolved = resolveSpring(spring || {})
    return () => resolved
  }
  return (key: string) => resolveSpring(spring(key) || {})
}

function resolveSpring(spring: SpringConfig) {
  let { frequency, damping, tension, friction, mass = 1 } = spring
  if (frequency != null) {
    frequency = Math.max(0.01, frequency)
    damping = Math.max(0, damping ?? 1)
    tension = Math.pow((2 * Math.PI) / frequency, 2) * mass
    friction = (4 * Math.PI * damping * mass) / frequency
  } else {
    tension = 170 * (tension ?? 1)
    friction = 26 * (friction ?? 1)
  }
  return {
    ...spring,
    tension,
    friction,
    mass,
  }
}

function ensureFromValues(
  target: Element,
  state: AnimatedElement,
  nodes: {
    [key: string]: AnimatedNode
  }
) {
  let computedStyle: CSSStyleDeclaration | undefined

  const getStyleProp = (prop: any) => {
    if (state.svgMode) {
      return target.getAttribute(prop) || svgNonZeroDefaults[prop] || '0'
    }
    return (
      (target as HTMLElement).style[prop] ||
      (computedStyle ||= getComputedStyle(target))[prop]
    )
  }

  for (const [key, node] of Object.entries(nodes)) {
    if (node.done || node.from != null) {
      continue
    }
    if (node.transformFn) {
      let from: ParsedValue | undefined
      for (const [fn, args] of state.transform!.read()) {
        if (fn == node.transformFn) {
          from = args[0]
          break
        }
        if (state.svgMode && fn == 'scale') {
          if (key == 'scaleX') {
            from = args[0]
            break
          }
          if (key == 'scaleY') {
            from = args[1]
            break
          }
        }
      }

      const to = node.to as ParsedValue
      if (!from || from[1] == to[1] || isNaN(node.v0)) {
        node.from = from || [cssTransformDefaults[node.transformFn] || 0, to[1]]
      } else {
        console.error(`Unit mismatch for "${key}": ${from[1]} != ${to[1]}`)
      }
    } else {
      const value = getStyleProp(key)
      node.from = isColorKey(key, state.svgMode)
        ? parseColor(resolveCssVariable(value, target))
        : [parseFloat(value), '']
    }
  }
}

function resolveCssVariable(value: string, target: Element) {
  if (value.startsWith('var(')) {
    const varNameStart = value.indexOf('(') + 1
    const varName = value.slice(varNameStart, -1)
    const varValue = getComputedStyle(target).getPropertyValue(varName)
    if (!varValue) {
      throw Error(`CSS variable not found: ${varName}`)
    }
    return varValue
  }
  return value
}
