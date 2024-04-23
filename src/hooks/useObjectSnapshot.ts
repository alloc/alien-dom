import { useSnapshot } from './useSnapshot'

/**
 * Return the same object reference unless its properties have changed. Strict
 * equality is used to determine if a property has changed. Property order does
 * not matter. Undefined values are identical to omitted properties.
 */
export function useObjectSnapshot<T extends object>(o: T): T
export function useObjectSnapshot(object: any) {
  const keys = Object.keys(object)
    .filter(k => object[k] !== undefined)
    .sort()
  const values = keys.map(k => object[k])
  return useSnapshot(object, [...keys, ...values])
}
