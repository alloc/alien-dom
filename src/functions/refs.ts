import { ref } from '../observable'
import { attachRef } from './attachRef'

/**
 * Mutates an object so its enumerable properties are observable.
 */
export const refs = <Props extends object>(
  object: Props,
  didSet?: (key: keyof Props, newValue: any, oldValue: any) => void
) => {
  for (const [key, value] of Object.entries(object)) {
    attachRef(
      object,
      key,
      ref(value),
      didSet as (key: keyof any, newValue: any, oldValue: any) => void
    )
  }
  return object
}
