import { isArray } from '@alloc/is'
import { Falsy } from '@alloc/types'
import { Unref, isRef } from '../core/observable'
import { morphAttributes } from '../morphdom/morphAttributes'
import { CSSAttributes } from '../types'
import { HostProps } from './hostProps'
import { DefaultElement } from './types'

export type MergeStylesFn = (
  toStyle: CSSAttributes,
  fromStyle: Unref<JSX.HTMLStyleProp>
) => void

export function flattenStyleProp(
  node: DefaultElement,
  value: Unref<JSX.HTMLStyleProp>,
  style: CSSAttributes,
  merge: MergeStylesFn = Object.assign,
  hostProps?: HostProps,
  rootValue?: Exclude<typeof value, Falsy>
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
