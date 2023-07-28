import { Disposable, createDisposable } from '../disposable'
import { kAlienHostProps } from '../internal/symbols'
import { AnyElement } from '../internal/types'
import { ComputedRef, computed, ref } from '../observable'
import { useState } from './useState'

export type BoundingBox = DOMRectReadOnly & {
  observer: ResizeObserver | null
  setElement(element: AnyElement): void
}

export function useBoundingBox(): BoundingBox {
  return useState(initBoundingBox)
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
  let resizeEffect: Disposable

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
      if (!element) {
        resizeEffect?.dispose()
        return
      }

      rectRef.value = element.getBoundingClientRect()
      const observer = new ResizeObserver(() => {
        rectRef.value = element.getBoundingClientRect()
      })

      observer.observe(element)

      const hostProps = kAlienHostProps(element)!
      resizeEffect = hostProps.addEffect(
        createDisposable([], observer.disconnect, observer)
      )
    },
  }
}
