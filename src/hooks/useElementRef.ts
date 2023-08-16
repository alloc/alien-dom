import { createElementRef } from '../functions/createElementRef'
import type { EffectResult } from './useEffect'
import { useState } from './useState'

export const useElementRef = <T extends Element>(
  effect?: (element: T) => EffectResult
) => useState(createElementRef<T>, effect)
