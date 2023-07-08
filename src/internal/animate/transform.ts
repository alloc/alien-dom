import { applyAnimatedValue } from '../animate'
import { cssTransformAliases, cssTransformDefaults } from '../transform'
import type { DefaultElement } from '../types'
import { parseValue } from './parseValue'
import type { AnimatedElement, ParsedTransform } from './types'

export class AnimatedTransform {
  /** Parsed from the target's `style` property. */
  value: ParsedTransform | null = null
  // These are set only if an SVG transform is using percentage units.
  width: number | null = null
  height: number | null = null
  // These are set on each animation frame.
  newScale: [number, number] | null = null
  newCalls: TransformCall[] | null = null
  isIdentity: boolean

  constructor(readonly target: DefaultElement, readonly svgMode: boolean) {
    this.isIdentity = !svgMode
  }

  /**
   * Read the current `style.transform` property value. The result is
   * cached until the transform is next applied.
   */
  read() {
    return (this.value ||= parseTransform(this.target, this.svgMode))
  }

  addCall(
    key: string,
    value: number | string,
    unit: string,
    transformFn?: string
  ) {
    const fn = transformFn || resolveTransformFn(key, this.svgMode)
    if (fn == null) {
      return false
    }
    if (this.svgMode) {
      if (typeof value == 'number') {
        if (key == 'scaleX') {
          this.newScale ||= [1, 1]
          this.newScale[0] = value
          return
        }
        if (key == 'scaleY') {
          this.newScale ||= [1, 1]
          this.newScale[1] = value
          return
        }
        if (unit == '%') {
          // Relative values always work in HTML, but SVG only allows
          // absolute values in the `transform` attribute.
          if (this.width == null || this.height == null) {
            const bbox: DOMRect = (this.target as any).getBBox()
            this.width = bbox.width
            this.height = bbox.height
          }

          const dimension =
            key == 'x' ? this.width : key == 'y' ? this.height : null
          if (dimension != null) {
            value = `${dimension * (value / 100)}`
          }
        }
      }
      if (key == 'y') {
        value = `0 ${value}${unit}`
      }
    } else if (
      this.isIdentity &&
      typeof value == 'number' &&
      value != cssTransformDefaults[fn]
    ) {
      this.isIdentity = false
    }
    this.newCalls ||= []
    this.newCalls.push([fn, value, unit])
    return true
  }

  apply({ anchor, style }: AnimatedElement) {
    let {
      target,
      svgMode,
      newScale,
      newCalls,
      isIdentity: isNoTransform,
      value,
    } = this

    if (newScale) {
      this.newScale = null
      newCalls ||= []
      newCalls.push(['scale', newScale.join(', ')])
    } else if (newCalls) {
      this.newCalls = null
    } else {
      return
    }

    value ||= parseTransform(target, svgMode)

    this.value = this.width = this.height = null
    this.isIdentity = !svgMode

    if (anchor) {
      applyAnimatedValue(
        target,
        style,
        svgMode,
        'transformOrigin',
        `${anchor[0] * 100}% ${anchor[1] * 100}%`
      )
    }

    const newTransform = renderTransform(value, newCalls, isNoTransform)
    applyAnimatedValue(target, style, svgMode, 'transform', newTransform)
  }
}

export function resolveTransformFn(key: string, svgMode: boolean) {
  return key in cssTransformAliases
    ? svgMode
      ? key === 'x' || key === 'y'
        ? 'translate'
        : key
      : cssTransformAliases[key] || key
    : null
}

function parseTransform(target: Element, svgMode: boolean) {
  // Note that we can't use the `computedStyle` here, because it
  // compacts the transform string into a matrix, which obfuscates the
  // individual transform functions.
  const transform = svgMode
    ? target.getAttribute('transform') || ''
    : (target as HTMLElement).style.transform

  const result: ParsedTransform = []
  const regex = /([a-z]+)\(([^)]+)\)/gi
  let match: RegExpMatchArray | null
  while ((match = regex.exec(transform))) {
    let transformFn = match[1]
    if (transformFn === 'rotateZ') {
      transformFn = 'rotate'
    }

    const parsedValues = match[2]
      .split(/(?:, *| +)/)
      .map(rawValue => parseValue(rawValue)!)

    result.push([transformFn, parsedValues])
  }
  return result
}

type TransformCall =
  | [string, string | number, string]
  | [string, string | number]

function renderTransform(
  cachedTransform: ParsedTransform,
  newTransform: TransformCall[],
  isIdentity: boolean
) {
  const transform: TransformCall[] = []

  let index = 0
  let call = newTransform[0]

  cachedTransform.forEach(([fn, args]) => {
    if (call && fn == call[0]) {
      transform.push(call)
      call = newTransform[++index]
    } else {
      isIdentity = false
      if (args.length == 1) {
        transform.push([fn, ...args[0]])
      } else {
        transform.push([fn, args.map(arg => arg.join('')).join(', ')])
      }
    }
  })

  while (index < newTransform.length) {
    transform.push(newTransform[index++])
  }

  if (isIdentity) {
    return 'none'
  }
  return transform
    .map(([fn, value, unit = '']) => {
      return fn + `(${value}${unit})`
    })
    .join(' ')
}
