import { Disposable, createDisposable } from '../core/disposable'
import { ComputedRef, computed, ref } from '../core/observable'
import { getHostProps } from '../internal/symbols'
import { AnyElement } from '../internal/types'
import { defineProperty } from '../internal/util'
import { JSX } from '../types/jsx'

/**
 * An observable object that tracks the bounds of an element.
 */
export class ElementBounds implements JSX.ElementRef {
  constructor(element?: AnyElement | null) {
    if (element) this.setElement(element)
  }

  protected rectRef = ref<DOMRectReadOnly | null>(null)
  protected resizeEffect: Disposable | undefined
  protected observedElement: AnyElement | null = null
  protected observer: ResizeObserver | null = null
  protected locked = false

  protected topRef: ComputedRef<number> | undefined
  protected rightRef: ComputedRef<number> | undefined
  protected bottomRef: ComputedRef<number> | undefined
  protected leftRef: ComputedRef<number> | undefined
  protected widthRef: ComputedRef<number> | undefined
  protected heightRef: ComputedRef<number> | undefined

  get x() {
    return this.left
  }
  get y() {
    return this.top
  }
  get top() {
    return this.observe('top').value
  }
  get right() {
    return this.observe('right').value
  }
  get bottom() {
    return this.observe('bottom').value
  }
  get left() {
    return this.observe('left').value
  }
  get width() {
    return this.observe('width').value
  }
  get height() {
    return this.observe('height').value
  }

  toJSON() {
    return this.rectRef.value?.toJSON()
  }

  observe(key: Exclude<keyof DOMRectReadOnly, 'toJSON' | 'x' | 'y'>) {
    const propertyName = `${key}Ref` as const

    let ref = this[propertyName]
    if (!ref)
      defineProperty(this, propertyName, {
        enumerable: true,
        value: (ref = computed(() => this.rectRef.value?.[key] ?? NaN)),
      })

    return ref
  }

  setElement(element: AnyElement | null) {
    if (this.locked) return
    if ((this.observedElement = element)) {
      this.setupResizeEffect(element)
    } else {
      this.resizeEffect?.dispose()
      this.resizeEffect = undefined
    }
  }

  /**
   * While locked, the current bounds won't be updated when the target element
   * changes.
   */
  lock(flag: boolean) {
    if (flag === this.locked) return
    this.locked = flag

    if (this.locked) {
      this.resizeEffect?.dispose()
      this.resizeEffect = undefined
    } else if (this.observedElement) {
      this.setupResizeEffect(this.observedElement)
    }
  }

  dispose() {
    this.setElement(null)
  }

  protected setupResizeEffect(element: AnyElement) {
    this.rectRef.value = element.getBoundingClientRect()
    const observer = new ResizeObserver(() => {
      if (!this.locked) {
        this.rectRef.value = element.getBoundingClientRect()
      }
    })

    observer.observe(element)

    const hostProps = getHostProps(element)!
    this.resizeEffect = hostProps.addEffect(
      createDisposable([], observer.disconnect, observer)
    )
  }
}
