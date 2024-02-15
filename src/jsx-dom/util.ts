import { isArray } from '@alloc/is'

export {
  compareNodeNames,
  compareNodeWithTag,
  decamelize,
  forEach,
  keys,
  noop,
  toArray,
} from '../internal/util'

export function includes<T>(arg: T | readonly T[], value: T): boolean {
  return isArray(arg) ? arg.includes(value) : arg === value
}
