import { isArray } from '@alloc/is'
import { morphAttributes } from '../morphdom/morphAttributes'
import { isRef } from '../observable'
import { HTMLStyleAttribute } from '../types'
import { applyObjectProp } from './applyProp'
import { HostProps } from './hostProps'
import { DefaultElement, StyleAttributes } from './types'

export function flattenStyleProp(
  node: DefaultElement,
  value: HTMLStyleAttribute,
  style: StyleAttributes,
  hostProps?: HostProps,
  rootValue?: HTMLStyleAttribute
) {
  if (value != null && value !== false) {
    if (isArray(value)) {
      value.forEach(item => {
        if (isRef(item)) {
          hostProps?.addObserver('style', item, node => {
            morphAttributes(node, { style: rootValue }, 'style')
          })
          item = item.peek()
        }

        flattenStyleProp(node, item, style, hostProps, rootValue ?? value)
      })
    } else {
      applyObjectProp(node, 'style', value, hostProps, style)
    }
  }
  return style
}
