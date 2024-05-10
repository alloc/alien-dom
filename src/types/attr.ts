import type { AnyElement } from '../internal/types'
import type { JSX } from './jsx'

export type VarArgs<T> = T | readonly T[]
export type Booleanish = boolean | 'true' | 'false'

export interface AttrWithRef<Element extends AnyElement>
  extends JSX.IntrinsicAttributes {
  ref?: JSX.RefProp<Element>
}
