import { isBoolean, isObject } from '@alloc/is'
import { keys } from '../jsx-dom/util'
import { DOMClassAttribute } from '../types'

export function classToString(value: DOMClassAttribute): string {
  if (value != null && !isBoolean(value)) {
    if (Array.isArray(value)) {
      return value.map(classToString).filter(Boolean).join(' ')
    }

    if (typeof DOMTokenList !== 'undefined' && value instanceof DOMTokenList) {
      return '' + value
    }

    if (isObject(value)) {
      return keys(value)
        .filter(k => value[k])
        .join(' ')
    }

    return '' + value
  }

  return ''
}
