import { ArrayRef, arrayRef } from '../core/observable'
import { useConst } from './useConst'

export const useArrayRef = /* @__PURE__ */ useConst.bind(null, arrayRef) as <T>(
  init?: readonly T[],
  debugId?: string | number
) => ArrayRef<T>
