import { defineEffectType } from '../effects'
import { observe } from '../observable'

/**
 * Like `observe` but with a `target` argument that can be retargeted later.
 */
export const observeAs = /* @__PURE__ */ defineEffectType(
  <T extends object | void>(target: T, action: (target: T) => void) =>
    observe(() => action(target)).destructor
)
