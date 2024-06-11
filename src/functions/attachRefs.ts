import { isWhat } from '@alloc/is'
import { ReadonlyRef, Unref, isRef } from '../core/observable'
import { keys } from '../internal/util'
import { attachRef } from './attachRef'

/**
 * Attaches refs to an object.
 *
 * The `refs` object can override or extend the keys of `object`. The property
 * values of `refs` must be either an observable ref or undefined.
 */
export const attachRefs = <
  T extends object,
  R extends object & {
    [K in keyof T]?: ReadonlyRef<T[K]>
  }
>(
  object: T,
  refs: R & Record<string, ReadonlyRef<unknown> | undefined>,
  didSet?: (key: string, newValue: any, oldValue: any) => void
): AttachRefs<T, R> => {
  for (const key of keys(refs)) {
    const ref = refs[key]
    if (ref === undefined) {
      // Always assign undefined values so that V8 has less object shapes to
      // optimize.
      object[key as keyof T] = undefined!
      continue
    }
    if (DEV && !isRef(ref)) {
      throw Error(`Expected "${key}" to be a ref, got a ${isWhat(ref)}`)
    }
    attachRef(
      object,
      key,
      ref as ReadonlyRef,
      didSet as (key: keyof any, newValue: any, oldValue: any) => void
    )
  }
  return object as any
}

type Id<T> = T

/**
 * The return type of `attachRefs`.
 */
export type AttachRefs<
  T extends object,
  R extends Record<string, ReadonlyRef | undefined> & {
    [K in keyof T]?: ReadonlyRef<T[K]>
  }
> = Id<T & { [K in Exclude<keyof R, keyof T>]: Unref<R[K]> }>
