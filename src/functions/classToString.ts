import { isArray, isBoolean, isObject } from '@alloc/is'
import { DefaultElement } from '../internal/types'
import { enablePropObserver } from '../jsx-dom/jsx-runtime'
import { keys } from '../jsx-dom/util'
import { isRef } from '../observable'
import { DOMClassAttribute } from '../types'

export function classToString(
  value: DOMClassAttribute,
  node?: DefaultElement,
  rootValue?: DOMClassAttribute
): string {
  let result: string | undefined

  if (value != null && !isBoolean(value)) {
    if (isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const names = classToString(value[i], node, rootValue ?? value)
        if (names) {
          result = (result ? result + ' ' : '') + names
        }
      }
    } else if (isRef(value)) {
      result = classToString(value.peek(), node)
      if (node) {
        enablePropObserver(node, 'class', value, () => {
          // Update the class attribute without recreating the observer.
          node.setAttribute('class', classToString(rootValue))
        })
      }
    } else if (isObject(value) && value.constructor !== DOMTokenList) {
      for (const name of keys(value)) {
        if ((value as any)[name]) {
          result = (result ? result + ' ' : '') + name
        }
      }
    } else {
      result = String(value)
    }
  }

  return result ?? ''
}
