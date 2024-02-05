import { isString } from '@alloc/is'
import { Disposable, createDisposable } from '../disposable'
import { kAlienHostProps } from '../internal/symbols'
import { AnyElement } from '../internal/types'
import { ComputedRef, ReadonlyRef, computed, isRef, ref } from '../observable'
import { useHookOffset } from './useHookOffset'
import { useObserver } from './useObserver'
import { useQuerySelector } from './useSelector'
import { useState } from './useState'

export type BoundingBox = DOMRectReadOnly & {
  observer: ResizeObserver | null
  setElement(element: AnyElement | null): void
  lock(locked: boolean): void
  dispose(): void
}

export type BoundingBoxOptions = {
  /** Pause the resize observer when true. */
  lock?: boolean
  /**
   * If you cannot or prefer not to pass a ref, you may pass an element instead.
   */
  target?: string | HTMLElement | ReadonlyRef<HTMLElement | null> | null
}

export function useBoundingBox(options: BoundingBoxOptions = {}): BoundingBox {
  const bbox = useState(initBoundingBox)
  bbox.lock(options.lock ?? false)

  let { target } = options
  if (isString(target)) {
    target = useQuerySelector<HTMLElement>(target)
  } else {
    useHookOffset(4)
  }
  if (isRef(target)) {
    useObserver(
      target,
      target => {
        bbox.setElement(target)
      },
      [bbox]
    )
  } else {
    useHookOffset(2)
    if (target) {
      bbox.setElement(target)
    }
  }

  return bbox
}

const initBoundingBox = (): BoundingBox => {
  const rectRef = ref<DOMRectReadOnly | null>(null)
  const rectProp = (prop: Exclude<keyof DOMRectReadOnly, 'toJSON'>) =>
    computed(() => rectRef.value?.[prop] ?? NaN)

  let topRef: ComputedRef<number> | undefined
  let rightRef: ComputedRef<number> | undefined
  let bottomRef: ComputedRef<number> | undefined
  let leftRef: ComputedRef<number> | undefined
  let widthRef: ComputedRef<number> | undefined
  let heightRef: ComputedRef<number> | undefined
  let resizeEffect: Disposable | undefined
  let observedElement: AnyElement | null = null
  let locked = false

  function observe(element: AnyElement) {
    rectRef.value = element.getBoundingClientRect()
    const observer = new ResizeObserver(() => {
      if (!locked) {
        rectRef.value = element.getBoundingClientRect()
      }
    })

    observer.observe(element)

    const hostProps = kAlienHostProps(element)!
    resizeEffect = hostProps.addEffect(
      createDisposable([], observer.disconnect, observer)
    )
  }

  return {
    get x() {
      return this.left
    },
    get y() {
      return this.top
    },
    get top() {
      return (topRef ||= rectProp('top')).value
    },
    get right() {
      return (rightRef ||= rectProp('right')).value
    },
    get bottom() {
      return (bottomRef ||= rectProp('bottom')).value
    },
    get left() {
      return (leftRef ||= rectProp('left')).value
    },
    get width() {
      return (widthRef ||= rectProp('width')).value
    },
    get height() {
      return (heightRef ||= rectProp('height')).value
    },
    toJSON() {
      return rectRef.value?.toJSON()
    },
    observer: null,
    setElement(element) {
      if (locked) return
      if ((observedElement = element)) {
        observe(element)
      } else {
        resizeEffect?.dispose()
        resizeEffect = undefined
      }
    },
    lock(flag) {
      if (flag === locked) return
      locked = flag

      if (locked) {
        resizeEffect?.dispose()
        resizeEffect = undefined
      } else if (observedElement) {
        observe(observedElement)
      }
    },
    dispose() {
      this.setElement(null)
    },
  }
}
