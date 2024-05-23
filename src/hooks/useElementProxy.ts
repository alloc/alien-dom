import { createElementProxy } from '../addons/elementProxy'
import { useConst } from './useConst'
import type { EffectResult } from './useEffect'

export const useElementProxy = <T extends Element>(
  effect?: (element: T) => EffectResult
) => useConst(createElementProxy<T>, effect)
