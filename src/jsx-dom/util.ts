import { isArray, isNumber, isString } from '@alloc/is'
import { isAnimatedStyleProp, stopAnimatingKey } from '../internal/animate'
import { hasForEach, isFragment } from '../internal/duck'
import { kAlienElementTags } from '../internal/symbols'
import { cssTransformAliases, cssTransformUnits } from '../internal/transform'
import type { DefaultElement } from '../internal/types'
import { Fragment } from '../jsx-dom/jsx-runtime'
import { isUnitlessNumber } from './css-props'
import { isSvgChild } from './svg-tags'

export const keys: <T>(obj: T) => Array<string & keyof T> = Object.keys as any

export function toArray<T>(a: T): T extends readonly any[] ? T : T[] {
  return isArray(a) ? (a as any) : [a]
}

export function forEach<T>(
  arg: T,
  callback: (
    value: T extends any
      ? T extends { forEach(cb: (value: infer U) => any): any }
        ? U
        : Exclude<T, null | undefined>
      : never
  ) => void
): void {
  if (arg == null) return
  if (hasForEach(arg)) {
    arg.forEach(callback)
  } else {
    callback(arg as any)
  }
}

export function includes<T>(arg: T | readonly T[], value: T): boolean {
  return isArray(arg) ? arg.includes(value) : arg === value
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

const { set } = Reflect

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

  for (const key in style) {
    if (skipAnimated && isAnimatedStyleProp(element, key)) {
      continue
    }
    let value = style[key]
    if (value !== undefined) {
      let transformFn = cssTransformAliases[key]
      if (transformFn !== undefined) {
        transform ||= []
        if (value !== null) {
          const svgMode = isSvgChild(element)
          if (!transformFn || svgMode) {
            transformFn = key
          }
          if (isNumber(value) && !svgMode) {
            value += (cssTransformUnits[key] || '') as any
          }
          transform.push(transformFn + '(' + value + ')')
        }
      } else if (key === 'transform') {
        transform ||= []
        if (value !== null) {
          transform.push(value as string)
        }
      } else {
        if (isNumber(value) && !isUnitlessNumber[key]) {
          value += 'px' as any
        }
        set(element.style, key, value)
      }
      if (stopAnimated) {
        stopAnimatingKey(element, key)
      }
    }
  }

  if (transform) {
    set(
      element.style,
      'transform',
      transform.length ? transform.join(' ') : null
    )
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

export function compareNodeNames(
  fromNodeName: string,
  toNodeName: string
): boolean {
  if (fromNodeName !== toNodeName) {
    const fromCodeStart = fromNodeName.charCodeAt(0)
    const toCodeStart = toNodeName.charCodeAt(0)

    // If the target element is a virtual DOM node or SVG node then we may need
    // to normalize the tag name before comparing. Normal HTML elements that are
    // in the "http://www.w3.org/1999/xhtml" are converted to upper case.
    if (fromCodeStart <= 90 && toCodeStart >= 97) {
      // from is upper and to is lower
      return fromNodeName === toNodeName.toUpperCase()
    }
    if (toCodeStart <= 90 && fromCodeStart >= 97) {
      // to is upper and from is lower
      return toNodeName === fromNodeName.toUpperCase()
    }
    return false
  }
  return true
}

export function compareNodeWithTag(
  node: ChildNode | DocumentFragment,
  tag: any
): boolean {
  if (tag === Fragment) {
    return isFragment(node)
  }
  if (isString(tag)) {
    return compareNodeNames(node.nodeName, tag)
  }
  const tags = kAlienElementTags(node)
  return tags != null && tags.has(tag)
}
