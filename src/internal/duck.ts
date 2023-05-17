import { isObject } from '@alloc/is'
import type { JSX } from '../types/jsx'

export function canMatch(node: any): node is { matches: Function } {
  return typeof (node as any).matches == 'function'
}

export function hasForEach(arg: any): arg is { forEach: Function } {
  return typeof arg.forEach == 'function'
}

export function isIterable(arg: any): arg is Iterable<any> {
  return typeof arg[Symbol.iterator] == 'function'
}

/** NB: This assumes `obj` is not null. */
export function isArrayLike(obj: any): obj is object & ArrayLike<any> {
  return (
    isObject(obj) &&
    typeof (obj as any).length === 'number' &&
    typeof (obj as any).nodeType !== 'number'
  )
}

export function hasTagName<Tag extends string>(
  node: any,
  tagName: Tag
): node is JSX.ElementType<Lowercase<Tag>> {
  return node && node.tagName === tagName
}
