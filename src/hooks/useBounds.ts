import { isString } from '@alloc/is'
import { ObservableBounds } from '../addons/bounds'
import { ReadonlyRef, isRef } from '../observable'
import { useHookOffset } from './useHookOffset'
import { useObserver } from './useObserver'
import { useQuerySelector } from './useSelector'
import { useState } from './useState'

export type UseBoundsOptions = {
  /** Pause the resize observer when true. */
  lock?: boolean
  /**
   * If you cannot or prefer not to pass a ref, you may pass an element instead.
   */
  target?: string | HTMLElement | ReadonlyRef<HTMLElement | null> | null
}

export function useBounds(options: UseBoundsOptions = {}) {
  const bbox = useState(ObservableBounds)
  bbox.lock(options.lock ?? false)

  let { target } = options
  if (isString(target)) {
    target = useQuerySelector<HTMLElement>(target)
  } else {
    useHookOffset(4)
  }
  if (isRef(target)) {
    useObserver(target, target => {
      bbox.setElement(target)
    })
  } else {
    useHookOffset(3)
    if (target) {
      bbox.setElement(target)
    }
  }

  return bbox
}
