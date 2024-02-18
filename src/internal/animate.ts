import type { AnimatedElement, SpringTimeline } from './animate/types'
import { createSymbolProperty } from './symbolProperty'
import type { DefaultElement } from './types'
import { decamelize } from './util'

export const kAlienAnimatedState =
  createSymbolProperty<AnimatedElement>('alien.animated')

export function deleteTimeline(
  timelines: Record<string, SpringTimeline>,
  key: string
) {
  const timeline = timelines[key]
  if (timeline) {
    timeline.forEach(animation => {
      if (animation.timerId) {
        clearTimeout(animation.timerId)
      } else {
        animation.abortCtrl?.abort()
      }
    })
    delete timelines[key]
  }
}

export function getAnimatedKeys(element: DefaultElement) {
  const state = kAlienAnimatedState(element)
  if (state) {
    const keys = Object.keys(state.style)
    if (keys.length) {
      return keys
    }
  }
}

export function stopAnimatingKey(element: DefaultElement, key: string) {
  const state = kAlienAnimatedState(element)
  if (state?.nodes) {
    const node = state.nodes[key]
    if (node?.done === false) {
      node.done = true
      node.lastPosition = null
      node.lastVelocity = null
      node.v0 = 0
    }
    if (state.timelines) {
      deleteTimeline(state.timelines, key)
    }
  }
}

export function isAnimatedStyleProp(element: DefaultElement, key: string) {
  const state = kAlienAnimatedState(element)
  return state?.nodes?.[key] != null
}

export function applyAnimatedValue(
  target: DefaultElement,
  style: Record<string, any> | null,
  svgMode: boolean,
  key: string,
  value: any
) {
  if (style) {
    style[key] = value
  }
  if (svgMode) {
    target.setAttribute(decamelize(key, '-'), value)
  } else {
    target.style[key as any] = value
  }
}
