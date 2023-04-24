import type { JSX } from '../types/jsx'
import type { StyleAttributes } from '../internal/types'
import { currentComponent } from '../global'
import { kAlienElementKey } from '../symbols'
import { updateStyle, UpdateStyle } from '../jsx-dom/util'
import { effect } from '@preact/signals-core'
import { useState } from './useState'
import { onUnmount } from '../domObserver'
import { depsHaveChanged } from '../internal/deps'

/**
 * Update the style of an element during render. This hook is preferred
 * to calling `element.css` directly, because it updates the newest
 * version of the `element`. The style is applied through morphdom,
 * which means it won't interfere with animations.
 */
export function useStyle(
  element: JSX.Element,
  style: Partial<StyleAttributes>
): void

/**
 * Observable access within the useStyle callback does not trigger a
 * re-render. Instead, the element is updated directly. This is useful
 * for performance reasons when the style is updated frequently or the
 * component is expensive to re-render.
 *
 * ⚠️ Note that this hook currently interferes with animations.
 */
export function useStyle(
  element: JSX.Element,
  style: () => Partial<StyleAttributes>,
  deps: readonly any[]
): void

/** @internal */
export function useStyle(
  element: JSX.Element,
  style: Partial<StyleAttributes> | (() => Partial<StyleAttributes>),
  deps?: readonly any[]
) {
  const component = currentComponent.get()!
  const key = kAlienElementKey(element)!
  if (typeof style !== 'function') {
    const newElement = component.newElements!.get(key)
    if (newElement) {
      updateStyle(newElement, style)
    }
  } else if (deps) {
    const state = useState(initialState, style, deps)
    if (depsHaveChanged(deps, state.deps)) {
      state.dispose = undefined
      state.style = style
      state.deps = deps
    }
    const dispose = (state.dispose ||= effect(() => {
      const newElement = component.newElements?.get(key)
      updateStyle(newElement || element, state.style(), UpdateStyle.NonAnimated)
    }))
    onUnmount(element, dispose)
  }
}

const initialState = (
  style: () => Partial<StyleAttributes>,
  deps: readonly any[]
): {
  deps: readonly any[]
  dispose: (() => void) | undefined
  style: () => Partial<StyleAttributes>
} => ({
  deps,
  dispose: undefined,
  style,
})
