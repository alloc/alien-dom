import { ElementBounds } from '../addons/elementBounds'
import { useMemo } from './useMemo'

export function useElementBounds(deps?: readonly any[]) {
  return useMemo(ElementBounds, deps)
}
