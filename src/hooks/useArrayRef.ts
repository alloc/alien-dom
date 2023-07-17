import { ArrayRef, arrayRef } from '../observable'
import { useState } from './useState'

export const useArrayRef = /* @__PURE__ */ useState.bind(null, arrayRef) as <T>(
  init?: T[],
  debugId?: string | number
) => ArrayRef<T>