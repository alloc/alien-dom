import type { Falsy } from '@alloc/types'
import { isElementProxy } from '../addons/elementProxy'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import type { DefaultElement, StyleAttributes } from '../internal/types'
import { UpdateStyle, toArray, updateStyle } from '../jsx-dom/util'
import { observe } from '../observable'
import { usePrevious } from './usePrevious'
import { useState } from './useState'

/**
 * Update the style of an element during render. This hook is preferred
 * to calling `element.css` directly, because it updates the newest
 * version of the `element`. The style is applied through morphdom,
 * which means it won't interfere with animations.
 */
export function useStyle(
  element: DefaultElement | readonly DefaultElement[],
  style: StyleAttributes | Falsy,
  deps?: readonly any[]
): void

/**
 * Observable access within the useStyle callback does not trigger a
 * re-render. Instead, the element is updated directly. This is useful
 * for performance reasons when the style is updated frequently or the
 * component is expensive to re-render.
 */
export function useStyle(
  element: DefaultElement | readonly DefaultElement[],
  style: () => StyleAttributes | Falsy,
  deps: readonly any[]
): void

/** @internal */
export function useStyle(
  element: DefaultElement | readonly DefaultElement[],
  style: StyleAttributes | (() => StyleAttributes | Falsy) | Falsy,
  deps?: readonly any[]
) {
  const elements = toArray(element)

  if (typeof style !== 'function') {
    deps = deps ? [...elements, ...deps] : elements
    const prevDeps = usePrevious(deps)
    if (!style || !depsHaveChanged(deps, prevDeps)) return

    for (const element of elements) {
      if (isElementProxy(element)) {
        element.onceElementExists(element => {
          updateStyle(element, style)
        })
      } else {
        updateStyle(element, style)
      }
    }
  } else if (deps) {
    const state = useState(initialState, style, deps)
    if (state.dispose && depsHaveChanged(deps, state.deps)) {
      state.dispose()
      state.dispose = undefined
      state.style = style
      state.deps = deps
    }
    state.dispose ||= observe(() => {
      const style = state.style()
      if (!style) return

      for (const element of elements) {
        updateStyle(element, style, UpdateStyle.NonAnimated)
      }
    }).destructor
  }
}

const initialState = (
  style: () => StyleAttributes | Falsy,
  deps: readonly any[]
): {
  deps: readonly any[]
  dispose: (() => void) | undefined
  style: () => StyleAttributes | Falsy
} => ({
  deps,
  dispose: undefined,
  style,
})
