import { ReadonlyRef, isRef } from '../observable'

/**
 * Coerce a possibly reactive value to a raw value.
 */
export const unref = <T>(arg: T | ReadonlyRef<T>): T =>
  isRef(arg) ? arg.value : arg
