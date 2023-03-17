import { Color, mixColor, parseColor } from 'linear-color'
import { toArray } from './jsx-dom/util'
import { $$, AlienSelector } from './selectors'

export type SpringAnimation = {
  to: Partial<Record<AnimatedProp, number | string>>
  from?: Partial<Record<AnimatedProp, number | string>>
  spring?: SpringConfig
  velocity?: number
  anchor?: [number, number]
  onRest?: (props: AnimatedProps, target: HTMLElement) => void
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

export type AnimatedProp = string & keyof AnimatedProps
export type AnimatedColorProp = 'backgroundColor' | 'color'

export type AnimatedProps = {
  backgroundColor?: string
  color?: string
  opacity?: number
  rotate?: number
  scale?: number
  scaleX?: number
  scaleY?: number
  x?: number | string
  y?: number | string
  z?: number | string
}

export type ParsedValue = [number, string]

export type ParsedTransform = [string, ParsedValue][]

export type AnimatedType = Color | ParsedValue

export type AnimatedValue<T extends AnimatedType = AnimatedType> = {
  to: T
  from?: T
  done: boolean
  v0: number
  lastVelocity?: number
  lastPosition?: number
  anchor?: [number, number]
}

export type AnimationState<T extends AnimatedType = AnimatedType> = [
  AnimatedValue<T>,
  ResolvedSpringConfig
]

export type AnimatedElement = {
  props: {
    [P in AnimatedProp]?: AnimationState<
      P extends AnimatedColorProp ? Color : ParsedValue
    >
  }
  transform?: ParsedTransform
  onRest?: (props: AnimatedProps, target: HTMLElement) => void
}

export function animate(
  selector: AlienSelector,
  animations: SpringAnimation | SpringAnimation[]
) {
  const targets = $$(selector)
  for (const animation of toArray(animations)) {
    const spring = resolveSpring(animation.spring || {})
    targets.forEach(target => {
      let state = animatedElements.get(target)
      if (!state) {
        state = { props: {} }
        animatedElements.set(target, state)
        animatedElementIds.add(
          (target.dataset.animatedId = '' + nextElementId++)
        )
      }
      if (animation.onRest) {
        state.onRest = animation.onRest
      }
      const keys = Object.keys({
        ...animation.to,
        ...animation.from,
      }) as AnimatedProp[]
      for (const key of keys) {
        const from = animation.from?.[key]
        const to = animation.to[key]

        const isColor = colorKeys.includes(key)
        const parsedFrom =
          from != null
            ? isColor
              ? parseColor(resolveCssVariable(from as string, target))
              : parseValue(from)
            : undefined
        const parsedTo =
          (isColor
            ? parseColor(resolveCssVariable(to as string, target))
            : parseValue(to)) ?? parsedFrom

        if (!parsedTo) {
          continue
        }

        const propAnimation = (state.props[key] ||= [
          { v0: 0 },
        ] as any) as AnimationState
        propAnimation[1] = spring

        const [node] = propAnimation
        node.done = false
        node.to = parsedTo

        if (parsedFrom) {
          node.from = parsedFrom
          node.lastPosition = undefined
        }

        if (animation.velocity != null) {
          node.v0 = animation.velocity
          node.lastVelocity = undefined
        }

        if (animation.anchor && key == 'scale') {
          node.anchor = animation.anchor
        }
      }
    })
  }
  startLoop()
}

const colorKeys = ['backgroundColor', 'color']

const transformKeys: Record<string, string | 0> = {
  x: 'translateX',
  y: 'translateY',
  z: 'translateZ',
  rotate: 0,
  scale: 0,
  scaleX: 0,
  scaleY: 0,
  translateX: 0,
  translateY: 0,
  translateZ: 0,
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

    const animations: [HTMLElement, AnimatedElement][] = []

    for (const targetId of animatedElementIds) {
      const target = document.querySelector(`[data-animated-id="${targetId}"]`)
      if (!target) continue
      if (!(target instanceof HTMLElement)) {
        animatedElementIds.delete(targetId)
        animatedElements.delete(target)
        continue
      }
      const state = animatedElements.get(target)!
      resolveFromValues(target, state)
      animations.push([target, state])
    }

    for (const [target, state] of animations) {
      let newTransform: [string, string | ParsedValue][] | undefined
      let noTransform = true
      let done = true

      for (const [prop, [node, config]] of Object.entries(state.props)) {
        if (node.done) {
          continue
        }
        const position = advance(node, config, dt)
        const { to } = node
        if (Array.isArray(to)) {
          const fn = transformKeys[prop]
          if (fn != null) {
            newTransform ||= []

            if (node.anchor) {
              const anchorX = 100 * (0.5 - node.anchor[0])
              const anchorY = 100 * (0.5 - node.anchor[1])
              newTransform.push(['translate', `${anchorX}%, ${anchorY}%`])
            }

            newTransform.push([fn || prop, [position, to[1]]])
            if (position != transformIdentity[fn || prop]) {
              noTransform = false
            }

            if (node.anchor) {
              const anchorX = 100 * (node.anchor[0] - 0.5)
              const anchorY = 100 * (node.anchor[1] - 0.5)
              newTransform.push(['translate', `${anchorX}%, ${anchorY}%`])
            }
          } else {
            const value = position + to[1]
            target.style[prop as any] = value
          }
        } else {
          const value = mixColor(node.from as Color, to, position)
          target.style[prop as any] = value
        }
        if (!node.done) {
          done = false
        }
      }

      if (newTransform) {
        target.style.transform = renderTransform(
          state.transform!,
          newTransform,
          noTransform
        )
      }

      if (done) {
        // TODO: allow starting animation from onRest callback
        const { onRest } = state
        if (onRest) {
          const values = Object.fromEntries(
            (Object.keys(state.props) as AnimatedProp[]).map(prop => {
              const [{ lastPosition, from, to }] = state.props[prop]!
              if (lastPosition == null) {
                return [prop, undefined]
              }
              if (Array.isArray(to)) {
                const unit = to[1]
                if (unit) {
                  return [prop, lastPosition + unit]
                }
                return [prop, lastPosition]
              }
              return [prop, mixColor(from as Color, to, lastPosition)]
            })
          )
          onRest(values, target)
        }

        animatedElementIds.delete(target.dataset.animatedId!)
        animatedElements.delete(target)
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

function renderTransform(
  cachedTransform: ParsedTransform,
  newTransform: [string, string | ParsedValue][],
  noTransform: boolean
) {
  const transform: [string, string | ParsedValue][] = []

  let newTransformIndex = 0
  cachedTransform.forEach(t => {
    if (
      newTransformIndex < newTransform.length &&
      t[0] == newTransform[newTransformIndex][0]
    ) {
      transform.push(newTransform[newTransformIndex++])
    } else {
      transform.push(t)
      noTransform = false
    }
  })
  while (newTransformIndex < newTransform.length) {
    transform.push(newTransform[newTransformIndex++])
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
  const numSteps = Math.ceil(dt / step)
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
  value: number | string | null | undefined
): ParsedValue | null {
  if (value == null) {
    return null
  }
  if (typeof value == 'number') {
    return [value, '']
  }
  const match = value.match(/(-?[0-9]+(?:\.[0-9]+)?)(\D*)$/)
  if (!match) {
    throw Error(`Invalid value: ${value}`)
  }
  return match ? [parseFloat(match[1]), match[2]] : null
}

function resolveFromValues(target: HTMLElement, state: AnimatedElement) {
  let computedStyle: CSSStyleDeclaration | undefined
  let transform: ParsedTransform | undefined

  const getStyleProp = (prop: any) => {
    return (
      target.style[prop] || (computedStyle ||= getComputedStyle(target))[prop]
    )
  }

  for (const [key, [node]] of Object.entries(state.props)) {
    const isTransform = key in transformKeys
    if (isTransform) {
      // Note that we can't use the `computedStyle` here, because it
      // compacts the transform string into a matrix, which obfuscates
      // the individual transform functions.
      transform ||= parseTransformString(target.style.transform)
    }
    if (node.from != null) {
      continue
    }
    if (isTransform) {
      const to = node.to as ParsedValue
      const fn = transformKeys[key] || key

      let call = transform!.find(([name]) => name == fn)
      call ||= [fn, [transformIdentity[fn] || 0, to[1]]]

      const unit = call[1][1]
      if (unit == to[1]) {
        node.from = call[1]
      } else {
        console.error(`Unit mismatch for "${key}": ${unit} != ${to[1]}`)
      }
    } else {
      const isColor = colorKeys.includes(key)
      const value = getStyleProp(key)
      node.from = isColor
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
    // Skip "translate" (used by scaling anchor).
    if (match[1] != 'translate') {
      const parsedValue = parseValue(match[2])
      if (parsedValue) {
        result.push([match[1], parsedValue])
      }
    }
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
