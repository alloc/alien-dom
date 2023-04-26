import { Any, Falsy } from '@alloc/types'
import { Color, mixColor, parseColor } from 'linear-color'
import {
  AnyElement,
  DefaultElement,
  TransformAttributes,
} from './internal/types'
import { toArray, keys } from './jsx-dom/util'
import { $$, AlienSelector } from './selectors'
import { svgTags } from './jsx-dom/svg-tags'
import { Length } from './internal/types'
import {
  ResolvedSpringConfig,
  AnimatedNode,
  SpringTimeline,
  AnimatedElement,
  ParsedValue,
  ParsedTransform,
} from './internal/animate/types'
import {
  cssTransformDefaults,
  cssTransformAliases,
  cssTransformUnits,
} from './internal/transform'
import { deleteTimeline, applyAnimatedValue } from './internal/animate'
import { animatedElements } from './internal/global'

export type SpringAnimation<
  Element extends AnyElement = any,
  Props extends object = AnimatedProps<Element>
> = {
  to: Props
  from?: Props | Falsy
  spring?: SpringConfigOption<Props>
  velocity?: number | { [K in keyof Props]?: number }
  delay?: SpringDelay | { [K in keyof Props]?: SpringDelay }
  anchor?: [number, number]
  onChange?: FrameCallback<Element, Props>
  onRest?: FrameCallback<Element, Props>
}

export type SpringDelay = number | SpringDelayFn
export type SpringDelayFn = (
  signal: AbortSignal,
  key: string
) => Promise<any> | null | void

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
  step: StepAnimationFn<Element, Props>
  target: Element
  svgMode: boolean
  /** When true, the animation ends. */
  done: boolean
  /** When the animation started as a `requestAnimationFrame` timestamp. */
  t0: number
  /** Milliseconds since the previous frame. */
  dt: number
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

  if (typeof _animations === 'function') {
    const step = _animations
    if (targets.length) {
      targets.forEach((target, index) => {
        markAnimated(target)
        stepAnimationMap.set(target, {
          step,
          target,
          svgMode: !!svgTags[target.tagName] && target.tagName != 'svg',
          done: false,
          t0: null!,
          dt: 0,
          duration: 0,
          current: {},
          index,
        })
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
      let state = animatedElements.get(target)!
      if (!state) {
        state = {
          nodes: {},
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
          const from = animation.from != null ? animation.from[key] : null
          if (to != null || from != null) {
            definedKeys.add(key)
          }
        })

        if (animation.delay) {
          const { delay } = animation
          if (typeof delay === 'number') {
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
          } else if (typeof delay === 'function') {
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
  spring: SpringResolver,
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

function markAnimated(target: HTMLElement) {
  if (target.dataset.animatedId == null) {
    animatedElementIds.add((target.dataset.animatedId = '' + nextElementId++))
  }
}

function applyAnimation(
  target: HTMLElement,
  state: AnimatedElement,
  animation: SpringAnimation,
  spring: SpringResolver,
  keys: AnimatedProp<any>[]
) {
  markAnimated(target)
  startLoop()

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
    const node = updateAnimatedNode(
      target,
      state.svgMode,
      key,
      animation.to[key],
      animation.from != null ? animation.from[key] : null,
      state.nodes[key],
      spring,
      !animation.velocity || typeof animation.velocity === 'number'
        ? animation.velocity
        : animation.velocity[key],
      frame,
      onChange,
      onRest
    )
    if (node) {
      state.nodes[key] = node
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
  velocity?: number,
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
    isRelative: false,
    transformFn:
      key in cssTransformAliases
        ? (!svgMode && cssTransformAliases[key]) || key
        : null,
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

const animatedElementIds = new Set<string>()
const stepAnimationMap = new WeakMap<Element, StepAnimation>()

let loop: number | undefined
let lastTime: number | undefined
let nextElementId = 1

function startLoop() {
  if (loop) return
  loop = requestAnimationFrame(function step(now) {
    const dt = now - (lastTime || now)
    lastTime = now

    const stepAnimations: StepAnimation[] = []
    const springAnimations: [
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

      const stepAnimation = stepAnimationMap.get(target)
      const state = animatedElements.get(target)

      if (stepAnimation) {
        if (stepAnimation.done) {
          stepAnimationMap.delete(target)
        } else {
          stepAnimations.push(stepAnimation)
          if (!state) {
            continue
          }
        }
      }

      if (state) {
        let width: number | undefined
        let height: number | undefined

        // Relative values always work in HTML, but SVG only allows
        // absolute values in the `transform` attribute.
        if (state.svgMode) {
          const needMeasuredSize = Object.values(state.nodes).some(
            node => !node.done && node.isRelative && !!node.transformFn
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
        springAnimations.push([target, state, width, height])
      } else if (!stepAnimation || stepAnimation.done) {
        animatedElementIds.delete(targetId)
      }
    }

    const stepResults = new Map<any, any>()
    for (const animation of stepAnimations) {
      animation.t0 ??= now
      animation.dt = dt
      animation.duration += dt
      stepResults.set(animation.target, animation.step(animation))
    }

    for (let [target, state, width, height] of springAnimations) {
      const { nodes, svgMode, style } = state

      type FrameValue = [string, AnimatedNode<any>]
      const frames = new Map<Record<string, any>, FrameValue[]>()

      let newScale: [number, number] | undefined
      let newTransform: TransformCall[] | undefined
      let noTransform = !svgMode
      let done = true

      for (const [key, node] of Object.entries(nodes)) {
        if (node.done) {
          continue
        }
        const position = advance(node, node.spring, dt, key)
        if (node.frame) {
          const values = frames.get(node.frame) || []
          frames.set(node.frame, values)
          values.push([key, node])
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
                  key == 'x' ? width : key == 'y' ? height : NaN
                )!
                value = `${dimension * (position / 100)}`
              }
            }

            newTransform ||= []
            newTransform.push([fn, value || [position, to[1]]])

            if (
              noTransform &&
              position != cssTransformDefaults[node.transformFn]
            ) {
              noTransform = false
            }
          } else {
            const value = position + to[1]
            applyAnimatedValue(target, style, svgMode, key, value)
          }
        } else {
          const value = mixColor(node.from as Color, to, position)
          applyAnimatedValue(target, style, svgMode, key, value)
        }
      }

      const stepResult = stepResults.get(target)
      if (stepResult) {
        const stepAnimation = stepAnimationMap.get(target)!

        for (const key of keys(stepResult)) {
          const value = stepResult[key]
          if (value !== undefined) {
            stepAnimation.current[key] = value
          }

          const transformFn =
            key in cssTransformAliases
              ? (!stepAnimation.svgMode && cssTransformAliases[key]) || key
              : null

          if (transformFn) {
            const parsed = parseValue(value, defaultUnits[key])
            if (parsed) {
              newTransform ||= []
              newTransform.push([transformFn, parsed])
            }
          } else {
            applyAnimatedValue(
              stepAnimation.target,
              null,
              stepAnimation.svgMode,
              key,
              value
            )
          }
        }
      }

      if (newTransform || newScale) {
        if (state.anchor) {
          applyAnimatedValue(
            target,
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
        applyAnimatedValue(
          target,
          style,
          svgMode,
          'transform',
          renderTransform(state.transform!, newTransform!, noTransform)
        )
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

      if (done && !stepAnimationMap.has(target)) {
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

  const equalFromTo = from == to

  let position = node.lastPosition == null ? from : node.lastPosition
  let velocity = node.lastVelocity == null ? node.v0 : node.lastVelocity

  const precision =
    defaultPrecisions[prop] ||
    (equalFromTo ? 0.005 : Math.min(Math.abs(to - from) * 0.001, maxPrecision))

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
  if (typeof spring !== 'function') {
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

  for (const [key, node] of Object.entries(state.nodes)) {
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
        node.from = from || [cssTransformDefaults[node.transformFn] || 0, to[1]]
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
