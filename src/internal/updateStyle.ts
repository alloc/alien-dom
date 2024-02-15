import { isNumber } from '@alloc/is'
import { isUnitlessNumber } from '../jsx-dom/css-props'
import { isSvgChild } from '../jsx-dom/svg-tags'
import { isAnimatedStyleProp, stopAnimatingKey } from './animate'
import { cssTransformAliases, cssTransformUnits } from './transform'
import { DefaultElement } from './types'
import { set } from './util'

export const enum UpdateStyle {
  /** Interrupt related animations. */
  Interrupt = 1 << 0,
  /** Skip animated style properties. */
  NonAnimated = 1 << 1,
}

export function updateStyle(
  element: DefaultElement,
  style: any,
  flags?: UpdateStyle | 0
): void

export function updateStyle(
  element: DefaultElement,
  style: any,
  flags: UpdateStyle | 0 = 0
): any {
  let transform: string[] | undefined

  const skipAnimated = flags & UpdateStyle.NonAnimated
  const stopAnimated = flags & UpdateStyle.Interrupt

  for (const key in style) {
    if (skipAnimated && isAnimatedStyleProp(element, key)) {
      continue
    }
    let value = style[key]
    if (value !== undefined) {
      let transformFn = cssTransformAliases[key]
      if (transformFn !== undefined) {
        transform ||= []
        if (value !== null) {
          const svgMode = isSvgChild(element)
          if (!transformFn || svgMode) {
            transformFn = key
          }
          if (isNumber(value) && !svgMode) {
            value += (cssTransformUnits[key] || '') as any
          }
          transform.push(transformFn + '(' + value + ')')
        }
      } else if (key === 'transform') {
        transform ||= []
        if (value !== null) {
          transform.push(value as string)
        }
      } else {
        if (isNumber(value) && !isUnitlessNumber[key]) {
          value += 'px' as any
        }
        set(element.style, key, value)
      }
      if (stopAnimated) {
        stopAnimatingKey(element, key)
      }
    }
  }

  if (transform) {
    set(
      element.style,
      'transform',
      transform.length ? transform.join(' ') : null
    )
  }
}
