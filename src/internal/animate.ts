import type { DefaultElement } from './types'
import type { SpringTimeline } from './animate/types'
import { animatedElements } from './global'
import { decamelize } from '../jsx-dom/util'

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
  const state = animatedElements.get(element)
  if (state) {
    const keys = Object.keys(state.style)
    if (keys.length) {
      return keys
    }
  }
}

export function stopAnimatingKey(element: DefaultElement, key: string) {
  const state = animatedElements.get(element)
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
  const state = animatedElements.get(element)
  return state?.nodes?.[key] != null
}

export function setNonAnimatedStyle(
  element: DefaultElement,
  inlineStyle: string,
  remove?: boolean
) {
  const state = animatedElements.get(element)
  if (state?.nodes) {
    inlineStyle.split(/\s*;\s*/).forEach(property => {
      const [key, value] = property.split(/\s*:\s*/)
      if (state.nodes![key] == null) {
        element.style.setProperty(key, remove ? null : value)
      }
    })
  } else if (remove) {
    element.removeAttribute('style')
  } else {
    element.setAttribute('style', inlineStyle)
  }
}

export function copyAnimatedStyle(
  oldElement: DefaultElement,
  newElement: DefaultElement
) {
  const state = animatedElements.get(oldElement)
  if (state) {
    const { svgMode, style } = state
    for (const key in style) {
      applyAnimatedValue(newElement, null, svgMode, key, style[key])
    }
  }
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
