import { createElementProxy } from '../addons/elementProxy'
import { onceElementExists } from '../internal/elementProxy'
import { useConst } from './useConst'
import { useEffect, type EffectResult } from './useEffect'
import { useHookOffset } from './useHookOffset'

/**
 * Create a `Proxy` that forwards access/invocations to the DOM node of the JSX
 * element that receives this proxy in its `ref` prop.
 *
 * 🪝 This hook adds 3 to the hook offset.
 */
export function useElementProxy<T extends Element>(
  effect?: (element: T) => EffectResult,
  deps?: readonly any[]
) {
  const proxy = useConst(createElementProxy<T>)
  if (effect) {
    useEffect(() => {
      return onceElementExists(proxy as any, effect)
    }, deps)
  } else {
    useHookOffset(1)
  }
  return proxy
}
