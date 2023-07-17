import type { AnyElement } from '../internal/types'
import type { JSX } from '../jsx-dom/jsx-runtime'

export type Booleanish = boolean | 'true' | 'false'

/**
 * @internal You shouldn't need to use this type since you never see
 * these attributes inside your component or have to validate them.
 */
export interface Attributes {
  key?: JSX.ElementKey | null | undefined
}

export interface AttrWithRef<Element extends AnyElement> extends Attributes {
  ref?: JSX.Ref<Element> | false | null
}
