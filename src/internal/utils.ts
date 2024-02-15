import { isArray, isString } from '@alloc/is'
import { Fragment } from '../components/Fragment'
import { hasForEach, isFragment } from './duck'
import { kAlienElementTags } from './symbols'

export const set = /* @__PURE__ */ Reflect.set
export const defineProperty = /* @__PURE__ */ Object.defineProperty
export const noop = <T>() => undefined as T
export const keys: <T>(obj: T) => Array<string & keyof T> = Object.keys as any

export function decamelize(s: string, separator: string) {
  return s.replace(/[A-Z]/g, match => separator + match.toLowerCase())
}

export function at<T>(arr: readonly T[], index: number): T {
  return index < 0 ? arr[arr.length + index] : arr[index]
}

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
