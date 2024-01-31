import { createElementProxy } from '../elementProxy'
import type { EffectResult } from './useEffect'
import { useState } from './useState'

export const useElementProxy = <T extends Element>(
  effect?: (element: T) => EffectResult
) => useState(createElementProxy<T>, effect)
