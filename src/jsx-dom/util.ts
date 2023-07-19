import { isNumber } from '@alloc/is'
import { isAnimatedStyleProp, stopAnimatingKey } from '../internal/animate'
import { cssTransformAliases, cssTransformUnits } from '../internal/transform'
import type { DefaultElement } from '../internal/types'
import { ReadonlyRef, isRef } from '../observable'
import { isUnitlessNumber } from './css-props'
import { isSvgChild } from './svg-tags'

export const keys: <T>(obj: T) => Array<string & keyof T> = Object.keys as any

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
  /** Unwrap any refs and return a `Map` of them by property. */
  AllowRefs = 1 << 2,
}

type StyleKey = Omit<keyof CSSStyleDeclaration, 'length' | 'parentRule'>

export function updateStyle(
  element: DefaultElement,
  style: any,
  flags: UpdateStyle.AllowRefs
): Map<string, ReadonlyRef>

export function updateStyle(
  element: DefaultElement,
  style: any,
  flags: UpdateStyle.AllowRefs | 0
): Map<string, ReadonlyRef> | undefined

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
  const refs = flags & UpdateStyle.AllowRefs && new Map<string, ReadonlyRef>()

  for (const key of keys<StyleKey>(style)) {
    if (skipAnimated && isAnimatedStyleProp(element, key)) {
      continue
    }
    let value = style[key]
    if (refs && isRef(value)) {
      refs.set(key, value)
      value = value.peek()
    }
    let transformFn = cssTransformAliases[key]
    if (transformFn !== undefined) {
      const svgMode = isSvgChild(element)
      if (!transformFn || svgMode) {
        transformFn = key
      }
      if (isNumber(value) && !svgMode) {
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

  return refs
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
