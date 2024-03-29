import {
  AnimatedProp,
  AnimatedProps,
  SpringAnimation,
  animate,
} from '../addons/animate'
import { getAnimatedKeys } from '../internal/animate'
import { expectCurrentEffects } from '../internal/global'
import { shallowEquals } from '../internal/shallowEquals'
import type { DefaultElement } from '../internal/types'
import { toArray } from '../internal/util'
import { useState } from './useState'

export function useSpring<Element extends DefaultElement>(
  element: Element,
  animations: SpringAnimation<Element> | SpringAnimation<Element>[],
  shouldRun?: boolean | null
) {
  const { to, from } = Array.isArray(animations)
    ? mergeAnimations(animations)
    : (animations as {
        to?: Record<string, any>
        from?: Record<string, any>
      })

  const state = useState(UseSpring)
  if (shouldRun == null) {
    shouldRun = !!to && !shallowEquals(state.to, to)
  }

  if (shouldRun) {
    const effects = expectCurrentEffects()
    effects.run(() => {
      state.to = to
      state.from = from

      const animatedKeys = getAnimatedKeys(element)
      for (const animation of toArray(animations)) {
        let from = animation.from
        if (animation.to) {
          from ||= {} as AnimatedProps<Element>
          for (const key in animation.to) {
            // The "to" value becomes the initial value if no "from" value
            // is defined and the key hasn't been animated before.
            from[key] ??= (animation.to as any)[key]
          }
        }
        if (from && animatedKeys) {
          // Always use the current value as the "from" value if the key
          // has already been animated before.
          for (const key of animatedKeys) {
            delete from[key as AnimatedProp<Element>]
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

class UseSpring {
  to?: Record<string, any> = undefined
  from?: Record<string, any> = undefined
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
