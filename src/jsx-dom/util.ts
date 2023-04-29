import type { DefaultElement } from '../internal/types'
import type { JSX } from '../types/jsx'
import { isUnitlessNumber } from './css-props'
import { cssTransformAliases, cssTransformUnits } from '../internal/transform'
import { stopAnimatingKey, isAnimatedStyleProp } from '../internal/animate'
import { isSvgChild } from './svg-tags'

export const keys: <T>(obj: T) => Array<string & keyof T> = Object.keys as any

export function isBoolean(val: any): val is boolean {
  return typeof val === 'boolean'
}

export function isElement(val: any, nodeType?: number): val is Element {
  return (
    val &&
    typeof val.nodeType === 'number' &&
    (nodeType === undefined || val.nodeType === nodeType)
  )
}

export function hasTagName<Tag extends string>(
  node: any,
  tagName: Tag
): node is JSX.ElementType<Lowercase<Tag>> {
  return node && node.tagName === tagName
}

export function isString(val: any): val is string {
  return typeof val === 'string'
}

export function isNumber(val: any): val is number {
  return typeof val === 'number'
}

export function isObject(val: any) {
  return typeof val === 'object' ? val !== null : isFunction(val)
}

export function isFunction(val: any): val is Function {
  return typeof val === 'function'
}

export function isArrayLike(obj: any): obj is object & ArrayLike<any> {
  return (
    isObject(obj) &&
    typeof obj.length === 'number' &&
    typeof obj.nodeType !== 'number'
  )
}

export function hasForEach(obj: any): obj is { forEach: any } {
  return obj && isFunction(obj.forEach)
}

export function toArray<T>(a: T): T extends readonly any[] ? T : T[] {
  // @ts-ignore
  return Array.isArray(a) ? a : [a]
}

export function decamelize(s: string, separator: string) {
  return s.replace(/[A-Z]/g, match => separator + match.toLowerCase())
}

export const noop = <T>() => undefined as T

export const enum UpdateStyle {
  /** Interrupt related animations. */
  Interrupt = 1 << 0,
  /** Skip animated style properties. */
  NonAnimated = 1 << 1,
}

type StyleKey = Omit<keyof CSSStyleDeclaration, 'length' | 'parentRule'>

export function updateStyle(
  element: DefaultElement,
  style: any,
  flags: UpdateStyle = 0
) {
  let transform: string[] | undefined
  const skipAnimated = flags & UpdateStyle.NonAnimated
  const stopAnimated = flags & UpdateStyle.Interrupt
  for (const key of keys<StyleKey>(style)) {
    if (skipAnimated && isAnimatedStyleProp(element, key)) {
      continue
    }
    let value = style[key]
    let transformFn = cssTransformAliases[key]
    if (transformFn !== undefined) {
      const needSvgTransform = isSvgChild(element)
      if (!transformFn || needSvgTransform) {
        transformFn = key
      }
      if (isNumber(value) && !needSvgTransform) {
        value += (cssTransformUnits[key] || '') as any
      }
      transform ||= []
      transform.push(transformFn + '(' + value + ')')
    } else {
      if (isNumber(value) && !isUnitlessNumber[key]) {
        value += 'px' as any
      }
      element.style[key] = value
    }
    if (stopAnimated) {
      stopAnimatingKey(element, key)
    }
  }
  if (transform) {
    element.style.transform = transform.join(' ')
  }
}

/**
 * Function that takes in two values and compares them.
 * < 0 - should be returned when a < b
 * = 0 - should be returned when a == b
 * > 0 - should be returned when a > b
 */
export type Comparator<T> = (a: T, b: T) => number

/**
 * Takes in a __SORTED__ array and inserts the provided value into
 * the correct, sorted, position.
 * @param array the sorted array where the provided value needs to be inserted (in order)
 * @param insertValue value to be added to the array
 * @param comparator function that helps determine where to insert the value
 * @credit https://github.com/bhowell2/binary-insert-js
 */
export function binaryInsert<T>(
  array: T[],
  insertValue: T,
  comparator: Comparator<T>
) {
  /*
   * These two conditional statements are not required, but will avoid the
   * while loop below, potentially speeding up the insert by a decent amount.
   * */
  if (array.length === 0 || comparator(array[0], insertValue) >= 0) {
    array.splice(0, 0, insertValue)
    return array
  } else if (
    array.length > 0 &&
    comparator(array[array.length - 1], insertValue) <= 0
  ) {
    array.splice(array.length, 0, insertValue)
    return array
  }
  let left = 0,
    right = array.length
  let leftLast = 0,
    rightLast = right
  while (left < right) {
    const inPos = Math.floor((right + left) / 2)
    const compared = comparator(array[inPos], insertValue)
    if (compared < 0) {
      left = inPos
    } else if (compared > 0) {
      right = inPos
    } else {
      right = inPos
      left = inPos
    }
    // nothing has changed, must have found limits. insert between.
    if (leftLast === left && rightLast === right) {
      break
    }
    leftLast = left
    rightLast = right
  }
  // use right, because Math.floor is used
  array.splice(right, 0, insertValue)
  return array
}
