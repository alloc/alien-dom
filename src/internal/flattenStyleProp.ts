import { isArray } from '@alloc/is'
import { Falsy } from '@alloc/types'
import { ReadonlyRef, isRef } from '../core/observable'
import { morphAttributes } from '../morphdom/morphAttributes'
import { CSSAttributes } from '../types'
import { HostProps } from './hostProps'
import { HTMLOrSVGElement } from './types'

export type MergeStylesFn = (
  toStyle: CSSAttributes,
  fromStyle: Exclude<JSX.HTMLStyleProp, ReadonlyRef>
) => void

export function flattenStyleProp(
  node: HTMLOrSVGElement,
  value: Exclude<JSX.HTMLStyleProp, ReadonlyRef>,
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
