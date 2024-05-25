import { createRefs, type Refs } from '../internal/createRefs'
import { useConst } from './useConst'

export type { Refs }

/**
 * Like `useConst` but properties are observable. Array properties are wrapped
 * with `ArrayRef` objects. Note that destructured values won't be observable.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function useConstRefs<T extends object, Params extends any[]>(
  init: new (...params: Params) => T,
  ...params: Params
): Refs<T>

export function useConstRefs<T extends object, Params extends any[]>(
  init: (...params: Params) => T,
  ...params: Params
): Refs<T>

export function useConstRefs<T extends object>(init: T): Refs<T>

export function useConstRefs<T extends object>(
  init: T,
  ...params: any[]
): Refs<T> {
  return useConst(createRefs, init, params)
}
