import type { Falsy } from '@alloc/types'
import type { DefaultElement, StyleAttributes } from '../internal/types'
import { currentComponent } from '../internal/global'
import { kAlienElementKey } from '../internal/symbols'
import { updateStyle, UpdateStyle, toArray } from '../jsx-dom/util'
import { effect as observe } from '@preact/signals-core'
import { useState } from './useState'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { usePrevious } from './usePrevious'

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
  const component = currentComponent.get()!
  if (typeof style !== 'function') {
    deps = deps ? [...elements, ...deps] : elements
    const prevDeps = usePrevious(deps)
    if (!style || !depsHaveChanged(deps, prevDeps)) return

    for (const element of elements) {
      // If the element has no key, it won't be found in the newElements
      // cache. In that case, we just update the element directly.
      const key = kAlienElementKey(element)
      const newElement = component.newElements!.get(key!)
      updateStyle(newElement || element, style)
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
        const key = kAlienElementKey(element)
        const newElement = component.newElements?.get(key!)
        updateStyle(newElement || element, style, UpdateStyle.NonAnimated)
      }
    })
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
