import {
  SpringAnimation,
  copyAnimatedStyle,
  animate,
  getAnimatedKeys,
} from '../animate'
import { DefaultElement } from '../internal/types'
import { useMicrotask } from './useMicrotask'
import { useState } from './useState'
import { shallowEquals } from '../internal/shallowEquals'
import { toArray } from '../jsx-dom/util'
import { currentHooks } from '../global'

export function useSpring<Element extends DefaultElement>(
  element: Element,
  animations: SpringAnimation<Element> | SpringAnimation<Element>[],
  shouldRun?: boolean | null
) {
  const { to, from } = Array.isArray(animations)
    ? mergeAnimations(animations)
    : (animations as State)

  const state = useState(initialState)
  if (shouldRun == null) {
    shouldRun = !!to && !shallowEquals(state.to, to)
  }

  if (shouldRun) {
    const hooks = currentHooks.get()!
    hooks.enable(() => {
      state.to = to
      state.from = from

      const animatedKeys = getAnimatedKeys(element)
      for (const animation of toArray(animations)) {
        if (animation.to) {
          animation.from ||= {} as any
          for (const key in animation.to) {
            // The "to" value becomes the initial value if no "from" value
            // is defined and the key hasn't been animated before.
            animation.from![key] ??= (animation.to as any)[key]
          }
        }
        if (animation.from && animatedKeys) {
          // Always use the current value as the "from" value if the key
          // has already been animated before.
          for (const key of animatedKeys) {
            delete (animation.from as any)[key]
          }
        }
      }

      // Start animating when mounted. Since animations are
      // automatically stopped when the target is removed from the DOM,
      // we don't need to return a disable function.
      animate(element, animations as any)
    })
  }
}

type State = {
  to?: Record<string, any>
  from?: Record<string, any>
}

function initialState(): State {
  return { to: undefined, from: undefined }
}

function mergeAnimations(animations: readonly SpringAnimation[]) {
  let to: Record<string, any> | undefined
  let from: Record<string, any> | undefined
  for (const animation of animations) {
    for (const key in animation.to) {
      to ||= {}
      to[key] = animation.to[key]
    }
    for (const key in animation.from) {
      from ||= {}
      from[key] = animation.from[key]
    }
  }
  return { to, from }
}
