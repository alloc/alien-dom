import { UpdateStyle, updateStyle } from '../../internal/updateStyle'
import { CSSAttributes } from '../../types'

/**
 * Merge the given style object into the element's `style` attribute. If a style
 * property is being animated, the animation is interrupted. Any value accepted
 * by JSX is also accepted here.
 */
export const patchStyle = (
  context: HTMLElement | SVGSVGElement,
  style: CSSAttributes
) => updateStyle(context, style, UpdateStyle.Interrupt)
