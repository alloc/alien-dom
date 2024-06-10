import { isFunction } from '@alloc/is'
import type { Falsy } from '@alloc/types'
import { observe } from '../core/observable'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import type { HTMLOrSVGElement } from '../internal/types'
import { UpdateStyle, updateStyle } from '../internal/updateStyle'
import { toArray } from '../internal/util'
import type { CSSAttributes } from '../types'
import { useConstructor } from './internal/useConstructor'
import { useHookOffset } from './useHookOffset'
import { usePrevious } from './usePrevious'

/**
 * Update the style of an element during render. This hook is preferred
 * to calling `element.css` directly, because it updates the newest
 * version of the `element`. The style is applied through morphdom,
 * which means it won't interfere with animations.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function useStyle(
  element: HTMLOrSVGElement | readonly HTMLOrSVGElement[],
  style: CSSAttributes | Falsy,
  deps?: readonly any[]
): void

/**
 * Observable access within the useStyle callback does not trigger a
 * re-render. Instead, the element is updated directly. This is useful
 * for performance reasons when the style is updated frequently or the
 * component is expensive to re-render.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function useStyle(
  element: HTMLOrSVGElement | readonly HTMLOrSVGElement[],
  style: () => CSSAttributes | Falsy,
  deps: readonly any[]
): void

/** @internal */
export function useStyle(
  element: HTMLOrSVGElement | readonly HTMLOrSVGElement[],
  style: CSSAttributes | (() => CSSAttributes | Falsy) | Falsy,
  deps?: readonly any[]
) {
  const elements = toArray(element)

  if (!isFunction(style)) {
    deps = deps ? [...elements, ...deps] : elements

    const prevDeps = usePrevious(deps)
    if (style && depsHaveChanged(deps, prevDeps))
      for (const element of elements) {
        updateStyle(element, style)
      }
  } else if (deps) {
    const state = useConstructor(UseStyle)
    if (state.dispose && depsHaveChanged(deps, state.deps)) {
      state.dispose()
      state.dispose = undefined
      state.deps = deps
    }
    const getStyle = style
    state.dispose ||= observe(() => {
      const style = getStyle()
      if (!style) return

      for (const element of elements) {
        updateStyle(element, style, UpdateStyle.NonAnimated)
      }
    }).destructor
  } else {
    useHookOffset(1)
  }
}

class UseStyle {
  deps?: readonly any[] = undefined
  dispose?: () => void = undefined
}
