import { isArray } from '@alloc/is'
import { isRef } from '../core/observable'
import { morphAttributes } from '../morphdom/morphAttributes'
import { HTMLStyleAttribute } from '../types'
import { HostProps } from './hostProps'
import { CSSProps, DefaultElement } from './types'

export type MergeStylesFn = (
  toStyle: CSSProps,
  fromStyle: Exclude<HTMLStyleAttribute & object, readonly any[]>
) => void

export function flattenStyleProp(
  node: DefaultElement,
  value: HTMLStyleAttribute,
  style: CSSProps,
  merge: MergeStylesFn = Object.assign,
  hostProps?: HostProps,
  rootValue?: HTMLStyleAttribute
) {
  if (value != null && value !== false) {
    if (isArray(value)) {
      value.forEach(item => {
        if (isRef(item)) {
          hostProps?.addObserver('style', item, () => {
            morphAttributes(node, { style: rootValue }, 'style')
          })
          item = item.peek()
        }
        flattenStyleProp(
          node,
          item,
          style,
          merge,
          hostProps,
          rootValue ?? value
        )
      })
    } else {
      merge(style, value)
    }
  }
  return style
}
