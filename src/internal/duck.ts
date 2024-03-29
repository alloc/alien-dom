import { isNumber, isObject } from '@alloc/is'
import type { JSX } from '../types/jsx'
import {
  kCommentNodeType,
  kElementNodeType,
  kFragmentNodeType,
  kTextNodeType,
} from './constants'
import { DefaultElement } from './types'

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
): node is JSX.InstanceType<Lowercase<Tag>> {
  return node && node.tagName === tagName
}

export function isNode(val: any): val is Node | ChildNode | ParentNode {
  return isObject(val) && isNumber((val as any).nodeType)
}

export function isElement(node: Node): node is DefaultElement {
  return node.nodeType === kElementNodeType
}

export function isFragment(node: Node): node is DocumentFragment {
  return node.nodeType === kFragmentNodeType
}

export function isTextNode(node: Node): node is Text {
  return node.nodeType === kTextNodeType
}

export function isComment(node: Node): node is Comment {
  return node.nodeType === kCommentNodeType
}

export function isDocument(node: Node): node is Document {
  return node.nodeType === 9
}
