import type { HTMLAttributes } from './html'

export type Booleanish = boolean | 'true' | 'false'

export type ElementKey = string | number

// export interface RefObject<T> {
//   readonly current: T | null
// }
// export type RefCallback<T> = (instance: T) => void
//
// export type Ref<T> = RefCallback<T> | RefObject<T> | null

/**
 * @internal You shouldn't need to use this type since you never see
 * these attributes inside your component or have to validate them.
 */
export interface Attributes {
  key?: ElementKey | null | undefined
}
export interface AttrWithRef<T> extends Attributes {
  // ref?: Ref<T> | undefined
}
