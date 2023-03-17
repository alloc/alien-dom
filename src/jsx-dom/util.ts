import type { ComponentClass } from './types'

export const keys: <T>(obj: T) => Array<keyof T> = Object.keys as any

export function isBoolean(val: any): val is boolean {
  return typeof val === 'boolean'
}

export function isElement(val: any): val is Element {
  return val && typeof val.nodeType === 'number'
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

export function isComponentClass(
  Component: Function
): Component is ComponentClass {
  const { prototype } = Component
  return !!(prototype && prototype.isReactComponent)
}

export function isArrayLike(obj: any): obj is ArrayLike<any> {
  return (
    isObject(obj) &&
    typeof obj.length === 'number' &&
    typeof obj.nodeType !== 'number'
  )
}

export function forEach<V = any>(
  value: { [key: string]: V },
  fn: (value: V, key: string) => void
) {
  if (!value) return
  for (const key of keys(value)) {
    fn(value[key], key as any)
  }
}

export function toArray<T>(a: T): T extends any[] ? T : T[] {
  // @ts-ignore
  return Array.isArray(a) ? a : [a]
}
