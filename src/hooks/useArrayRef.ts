import { ArrayRef, arrayRef } from '../core/observable'
import { useState } from './useState'

export const useArrayRef = /* @__PURE__ */ useState.bind(null, arrayRef) as <T>(
  init?: readonly T[],
  debugId?: string | number
) => ArrayRef<T>
