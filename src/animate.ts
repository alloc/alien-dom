import { Any, Falsy, NoInfer } from '@alloc/types'
import { Color, mixColor, parseColor } from 'linear-color'
import { AnyElement, DefaultElement } from './internal/types'
import { decamelize, toArray } from './jsx-dom/util'
import { $$, AlienSelector } from './selectors'
import { svgTags } from './jsx-dom/svg-tags'

export type SpringAnimation<
  Element extends AnyElement = any,
  Props extends object = AnimatedProps<Element>
> = {
  to: Props
  from?: Props | Falsy
  spring?: SpringConfig
  velocity?: number | { [K in keyof Props]?: number }
  delay?: SpringDelay | { [K in keyof Props]?: SpringDelay }
  anchor?: [number, number]
  onChange?: FrameCallback<Element, Props>
  onRest?: FrameCallback<Element, Props>
}

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

type Length = number | string
type Angle = number | string

interface TransformProps {
  rotate?: Angle
  scale?: number
  scaleX?: number
  scaleY?: number
  x?: Length
  y?: Length
  z?: Length
}

export interface HTMLAnimatedProps extends TransformProps {
  backgroundColor?: string
  borderRadius?: Length
  color?: string
  opacity?: number
}

export interface SVGAnimatedProps extends TransformProps {
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

export type ParsedValue = [number, string]

export type ParsedTransform = [string, ParsedValue[]][]

export type AnimatedType = Color | ParsedValue

export type AnimatedValue<T extends AnimatedType = AnimatedType> = {
  to: T
  from: T | null
  done: boolean
  v0: number
  lastVelocity: number | null
  lastPosition: number | null
  isRelative: boolean
  transformFn: string | null
  frame: Record<string, any> | null
  onChange: FrameCallback<any> | null
  onRest: FrameCallback<any> | null
}

export type AnimationState<T extends AnimatedType = any> = [
  AnimatedValue<T>,
  ResolvedSpringConfig
]

export type FrameCallback<
  T extends AnyElement,
  Props extends object = AnimatedProps<T>
> = (props: [T] extends [Any] ? any : Required<Props>, target: T) => void

export type AnimatedElement = {
  props: { [prop: string]: AnimationState<AnimatedType> }
  svgMode: boolean
  transform: ParsedTransform | null
  anchor: readonly [number, number] | null
  timelines: { [prop: string]: SpringTimeline } | null
  /**
   * This contains the most recent values applied by an animation.
   *
   * The keys are the animated CSS properties.
   */
  style: Record<string, any>
}

type SpringTimeline = (SpringAnimation & {
  timerId?: number
  abortCtrl?: AbortController
})[]

type SpringDelay = number | SpringDelayFn

type SpringDelayFn = (
  signal: AbortSignal,
  key: string
) => Promise<any> | null | void

type OneOrMany<T> = T | readonly T[]

export function animate(
  elements: OneOrMany<HTMLElement> | NodeListOf<HTMLElement>,
  animations: OneOrMany<SpringAnimation<HTMLElement>>
): void

export function animate(
  elements: OneOrMany<SVGElement> | NodeListOf<SVGElement>,
  animations: OneOrMany<SpringAnimation<SVGElement>>
): void

export function animate(
  selector: AlienSelector,
  animations: OneOrMany<SpringAnimation<DefaultElement>>
): void

export function animate(
  selector: AlienSelector | readonly AnyElement[],
  _animations: OneOrMany<SpringAnimation>
) {
  const animations = toArray(_animations)
  const springs = animations.map(animation =>
    resolveSpring(animation.spring || {})
  )
  const targets = $$<HTMLElement>(selector)
  targets.forEach(target => {
    let timelines: Record<string, SpringTimeline> | undefined
    let state = animatedElements.get(target)!
    if (!state) {
      state = {
        props: {},
        svgMode: !!svgTags[target.tagName] && target.tagName != 'svg',
        transform: null,
        anchor: null,
        timelines: null,
        style: {},
      }
      animatedElements.set(target, state)
    }

    // Any defined keys will be removed from the previous timelines object.
    const definedKeys = new Set<string>()

    animations.forEach((animation, i) => {
      let keys = Object.keys({
        ...animation.to,
        ...animation.from,
      }) as AnimatedProp<any>[]

      keys.forEach(key => {
        const to = animation.to?.[key]
        const from = animation.from ? animation.from[key] : null
        if (to != null || from != null) {
          definedKeys.add(key)
        }
      })

      if (animation.delay) {
        const { delay } = animation
        if (typeof delay === 'number') {
          if (delay > 0) {
            timelines ||= {}
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
        } else if (typeof delay === 'function') {
          timelines ||= {}
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
              if (typeof keyDelay === 'number') {
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

      applyAnimation(target, state, animation, springs[i], keys)
    })

    const oldTimelines = state.timelines
    if (oldTimelines) {
      definedKeys.forEach(key => {
        if (!oldTimelines[key]) {
          return
        }
        oldTimelines[key].forEach(timeline => {
          if (timeline.timerId) {
            clearTimeout(timeline.timerId)
          } else {
            timeline.abortCtrl?.abort()
          }
        })
        delete oldTimelines[key]
      })
    }

    if (timelines) {
      state.timelines = { ...oldTimelines, ...timelines }
    }
  })
  startLoop()
}

function addTimelineTimeout(
  timelines: Record<string, SpringTimeline> | undefined,
  target: HTMLElement,
  state: AnimatedElement,
  animation: SpringAnimation,
  spring: ResolvedSpringConfig,
  delay: number,
  key: string
) {
  if (delay > 0) {
    const timerId = setTimeout(() => {
      applyAnimation(target, state, animation, spring, [key])
    }, delay)

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
  spring: ResolvedSpringConfig,
  delay: SpringDelayFn,
  key: string
) {
  const abortCtrl = new AbortController()
  const promise = delay(abortCtrl.signal, key)
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

/** @internal */
export function getAnimatedKeys(element: DefaultElement) {
  const state = animatedElements.get(element)
  if (state) {
    const keys = Object.keys(state.style)
    if (keys.length) {
      return keys
    }
  }
}

/** @internal */
export function copyAnimatedStyle(
  oldElement: DefaultElement,
  newElement: DefaultElement
) {
  const state = animatedElements.get(oldElement)
  if (state) {
    const { svgMode, style } = state
    for (const key in style) {
      set(newElement as any, style, svgMode, key, style[key])
    }
  }
  const { animatedId } = oldElement.dataset
  if (animatedId) {
    newElement.dataset.animatedId = animatedId
  }
}

function applyAnimation(
  target: HTMLElement,
  state: AnimatedElement,
  animation: SpringAnimation,
  spring: ResolvedSpringConfig,
  keys: AnimatedProp<any>[]
) {
  if (target.dataset.animatedId == null) {
    animatedElementIds.add((target.dataset.animatedId = '' + nextElementId++))
  }

  state.anchor =
    animation.anchor ||
    (state.anchor
      ? state.svgMode
        ? svgDefaultAnchor
        : htmlDefaultAnchor
      : null)

  const { onChange, onRest } = animation
  const frame: Record<string, any> | null = onChange || onRest ? {} : null

  for (const key of keys) {
    const prop: AnimationState = state.props[key] || [null!, spring]
    const node = applyAnimatedValue(
      target,
      state.svgMode,
      key,
      animation.to[key],
      animation.from ? animation.from[key] : null,
      prop[0],
      frame,
      !animation.velocity || typeof animation.velocity === 'number'
        ? animation.velocity
        : animation.velocity[key],
      onChange,
      onRest
    )
    if (!node) {
      continue
    }
    if (prop[0]) {
      prop[1] = spring
    } else {
      prop[0] = node
      state.props[key] = prop
    }
  }
}

function applyAnimatedValue(
  target: HTMLElement,
  svgMode: boolean,
  key: string,
  to: any,
  from?: any,
  node?: AnimatedValue | null,
  frame?: Record<string, any> | null,
  velocity?: number,
  onChange?: FrameCallback<any>,
  onRest?: FrameCallback<any>
): AnimatedValue | null {
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
    isRelative: false,
    transformFn:
      key in transformKeys ? (!svgMode && transformKeys[key]) || key : null,
    frame: null,
    onChange: null,
    onRest: null,
  }

  node.done = false
  node.to = parsedTo
  node.from = parsedFrom
  node.frame = frame || null
  node.onChange = onChange || null
  node.onRest = onRest || null

  if (parsedFrom) {
    node.lastPosition = null
  }

  if (velocity != null) {
    node.v0 = velocity
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
  borderRadius: 'px',
  x: 'px',
  y: 'px',
  z: 'px',
  rotate: 'deg',
}

const svgNonZeroDefaults: Record<string, string> = {
  fill: 'rgba(0,0,0,0)',
  fillOpacity: '1',
  stroke: 'rgba(0,0,0,0)',
  strokeOpacity: '1',
  opacity: '1',
}

const scaleKeys = ['scale', 'scaleX', 'scaleY']
const transformKeys: Record<string, string | 0> = {
  x: 'translateX',
  y: 'translateY',
  z: 'translateZ',

  // These functions are not aliased.
  rotate: 0,
  scale: 0,
  scaleX: 0,
  scaleY: 0,
}

const transformIdentity: Record<string, number | null> = {
  rotate: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  translateX: 0,
  translateY: 0,
  // Ensure that translateZ(0) stays in the transform, so the browser
  // continues to use hardware acceleration.
  translateZ: null,
}

const animatedElementIds = new Set<string>()
const animatedElements = new WeakMap<Element, AnimatedElement>()

let loop: number | undefined
let lastTime: number | undefined
let nextElementId = 1

function startLoop() {
  if (loop) return
  loop = requestAnimationFrame(function step(now) {
    const dt = now - (lastTime || now)
    lastTime = now

    const animations: [
      target: DefaultElement,
      state: AnimatedElement,
      width?: number,
      height?: number
    ][] = []

    for (const targetId of animatedElementIds) {
      const target = document.querySelector(
        `[data-animated-id="${targetId}"]`
      ) as DefaultElement
      if (!target) {
        animatedElementIds.delete(targetId)
        continue
      }

      const state = animatedElements.get(target)
      if (!state) {
        animatedElementIds.delete(targetId)
        continue
      }

      let width: number | undefined
      let height: number | undefined

      // Relative values always work in HTML, but SVG only allows
      // absolute values in the `transform` attribute.
      if (state.svgMode) {
        const needMeasuredSize = Object.values(state.props).some(
          ([node]) => !node.done && node.isRelative && !!node.transformFn
        )
        if (needMeasuredSize) {
          // TODO: what if width/height are also animated? this will be
          // immediately stale.
          const bbox: DOMRect = (target as any).getBBox()
          width = bbox.width
          height = bbox.height
        }
      }

      resolveFromValues(target, state)
      animations.push([target, state, width, height])
    }

    for (let [target, state, width, height] of animations) {
      const { props, svgMode, style } = state

      type FrameValue = [string, AnimatedValue<any>]
      const frames = new Map<Record<string, any>, FrameValue[]>()

      let newScale: [number, number] | undefined
      let newTransform: TransformCall[] | undefined
      let noTransform = !svgMode
      let done = true

      for (const [prop, [node, config]] of Object.entries(props)) {
        if (node.done) {
          continue
        }
        const position = advance(node, config, dt)
        if (node.frame) {
          const values = frames.get(node.frame) || []
          frames.set(node.frame, values)
          values.push([prop, node])
        }
        if (!node.done) {
          done = false
        }
        const { to } = node
        if (Array.isArray(to)) {
          if (node.transformFn) {
            let fn = node.transformFn
            let value: string | ParsedValue | undefined
            if (svgMode) {
              if (fn == 'scaleX') {
                newScale ||= [1, 1]
                newScale[0] = position
                continue
              }
              if (fn == 'scaleY') {
                newScale ||= [1, 1]
                newScale[1] = position
                continue
              }
              if (to[1] == '%') {
                const dimension = (
                  prop == 'x' ? width : prop == 'y' ? height : NaN
                )!
                value = `${dimension * (position / 100)}`
              }
            }

            newTransform ||= []
            newTransform.push([fn, value || [position, to[1]]])

            if (
              noTransform &&
              position != transformIdentity[node.transformFn]
            ) {
              noTransform = false
            }
          } else {
            const value = position + to[1]
            set(target as any, style, svgMode, prop, value)
          }
        } else {
          const value = mixColor(node.from as Color, to, position)
          set(target as any, style, svgMode, prop, value)
        }
      }

      if (newTransform || newScale) {
        if (state.anchor) {
          set(
            target as any,
            style,
            svgMode,
            'transformOrigin',
            `${state.anchor[0] * 100}% ${state.anchor[1] * 100}%`
          )
        }
        if (newScale) {
          newTransform ||= []
          newTransform.push(['scale', newScale.join(', ')])
        }
        const transform = renderTransform(
          state.transform!,
          newTransform!,
          noTransform
        )
        set(target as any, style, svgMode, 'transform', transform)
      }

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

      if (done) {
        animatedElementIds.delete(target.dataset.animatedId!)
        delete target.dataset.animatedId
      }
    }

    if (animatedElementIds.size) {
      loop = requestAnimationFrame(step)
    } else {
      loop = undefined
      lastTime = undefined
    }
  })
}

function readValue({ lastPosition, from, to }: AnimatedValue) {
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

function set(
  target: HTMLElement,
  style: Record<string, any>,
  svgMode: boolean,
  key: string,
  value: any
) {
  style[key] = value
  if (svgMode) {
    target.setAttribute(decamelize(key, '-'), value)
  } else {
    target.style[key as any] = value
  }
}

type TransformCall = [string, string | ParsedValue]

function renderTransform(
  cachedTransform: ParsedTransform,
  newTransform: TransformCall[],
  noTransform: boolean
) {
  const transform: TransformCall[] = []

  let index = 0
  let call = newTransform[0]

  cachedTransform.forEach(([fn, args]) => {
    if (call && fn == call[0]) {
      transform.push(call)
      call = newTransform[++index]
    } else {
      const value =
        args.length == 1 ? args[0] : args.map(arg => arg.join('')).join(', ')
      transform.push([fn, value])
      noTransform = false
    }
  })

  while (index < newTransform.length) {
    transform.push(newTransform[index++])
  }

  if (noTransform) {
    return 'none'
  }
  return transform
    .map(([fn, value]) => {
      if (typeof value != 'string') {
        value = value.join('')
      }
      return fn + `(${value})`
    })
    .join(' ')
}

type ResolvedSpringConfig = SpringConfig & {
  tension: number
  friction: number
  mass: number
}

function advance(
  node: AnimatedValue,
  config: ResolvedSpringConfig,
  dt: number
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

  const equalFromTo = from == to

  let position = node.lastPosition == null ? from : node.lastPosition
  let velocity = node.lastVelocity == null ? node.v0 : node.lastVelocity

  const precision = equalFromTo
    ? 0.005
    : Math.min(1, Math.abs(to - from) * 0.001)

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

  let finished = false

  const step = 1 // 1ms
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

    velocity = velocity + acceleration * step // pt/ms
    position = position + velocity * step
  }

  if (finished) {
    node.done = true
    position = to
  }

  node.lastVelocity = velocity
  node.lastPosition = position
  return position
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

function parseValue(
  value: number | string | null | undefined,
  defaultUnit?: string
): ParsedValue | null {
  if (value == null) {
    return null
  }
  if (typeof value == 'number') {
    return [value, defaultUnit || '']
  }
  const match = value.match(/(-?[0-9]+(?:\.[0-9]+)?)(\D*)$/)
  if (!match) {
    throw Error(`Invalid value: ${value}`)
  }
  return match ? [parseFloat(match[1]), match[2]] : null
}

function resolveFromValues(target: Element, state: AnimatedElement) {
  let computedStyle: CSSStyleDeclaration | undefined
  let transform: ParsedTransform | null = null

  const getStyleProp = (prop: any) => {
    if (state.svgMode) {
      return target.getAttribute(prop) || svgNonZeroDefaults[prop] || '0'
    }
    return (
      (target as HTMLElement).style[prop] ||
      (computedStyle ||= getComputedStyle(target))[prop]
    )
  }

  for (const [key, [node]] of Object.entries(state.props)) {
    if (node.transformFn) {
      // Note that we can't use the `computedStyle` here, because it
      // compacts the transform string into a matrix, which obfuscates
      // the individual transform functions.
      transform ||= parseTransformString(
        state.svgMode
          ? target.getAttribute('transform') || ''
          : (target as HTMLElement).style.transform
      )

      if (node.from != null) {
        continue
      }

      let from: ParsedValue | undefined
      for (const [fn, args] of transform!) {
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
      if (!from || from[1] == to[1]) {
        node.from = from || [transformIdentity[node.transformFn] || 0, to[1]]
      } else {
        console.error(`Unit mismatch for "${key}": ${from[1]} != ${to[1]}`)
      }
    } else if (node.from == null) {
      const value = getStyleProp(key)
      node.from = isColorKey(key, state.svgMode)
        ? parseColor(resolveCssVariable(value, target))
        : [parseFloat(value), '']
    }
  }

  // Save the parsed transform so we can keep static parts intact.
  state.transform = transform
}

function parseTransformString(str: string) {
  const result: ParsedTransform = []
  const regex = /([a-z]+)\(([^)]+)\)/gi
  let match: RegExpMatchArray | null
  while ((match = regex.exec(str))) {
    const parsedValues = match[2]
      .split(/(?:, *| +)/)
      .map(rawValue => parseValue(rawValue)!)

    result.push([match[1], parsedValues])
  }
  return result
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
