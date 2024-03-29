import { isArray, isBoolean, isObject } from '@alloc/is'
import { ReadonlyRef, isRef } from '../core/observable'
import { morphAttributes } from '../morphdom/morphAttributes'
import { DOMClassAttribute } from '../types'
import { HostProps } from './hostProps'
import { keys } from './util'

export function flattenClassProp(
  value: DOMClassAttribute | ReadonlyRef<DOMClassAttribute>,
  hostProps?: HostProps,
  refs?: Set<ReadonlyRef>,
  rootValue?: DOMClassAttribute
) {
  let result: string | undefined

  if (value != null && !isBoolean(value)) {
    if (!refs && hostProps) {
      refs = new Set<ReadonlyRef>()
    }

    if (isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const names = flattenClassProp(
          value[i],
          hostProps,
          refs,
          rootValue ?? value
        )
        if (names) {
          result = (result ? result + ' ' : '') + names
        }
      }
    } else if (isRef(value)) {
      if (hostProps) {
        addClassObserver(hostProps, value, refs!, rootValue)
      }
      result = flattenClassProp(value.peek(), hostProps, refs, rootValue)
    } else if (isObject(value) && value.constructor !== DOMTokenList) {
      for (const name of keys(value)) {
        let enabled = (value as any)[name] as boolean | ReadonlyRef<boolean>
        if (isRef(enabled)) {
          if (hostProps) {
            addClassObserver(hostProps, enabled, refs!, rootValue)
          }
          enabled = enabled.peek()
        }
        if (enabled) {
          result = (result ? result + ' ' : '') + name
        }
      }
    } else {
      result = String(value)
    }
  }

  return result ?? ''
}

function addClassObserver(
  hostProps: HostProps,
  ref: ReadonlyRef,
  refs: Set<ReadonlyRef>,
  rootValue: DOMClassAttribute
) {
  if (!refs.has(ref)) {
    refs.add(ref)

    hostProps.addObserver('class', ref, () => {
      morphAttributes(hostProps.node, { class: rootValue }, 'class')
    })
  }
}
