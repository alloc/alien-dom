import type { AnyElement } from '../internal/types'
import type { AlienEffects } from '../effects'

export type Booleanish = boolean | 'true' | 'false'

export type ElementKey = string | number

/**
 * @internal You shouldn't need to use this type since you never see
 * these attributes inside your component or have to validate them.
 */
export interface Attributes {
  key?: ElementKey | null | undefined
}

export interface AttrWithRef<Element extends AnyElement> extends Attributes {
  ref?: AlienEffects<Element> | undefined
}
