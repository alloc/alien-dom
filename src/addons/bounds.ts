import { kAlienHostProps } from '../internal/symbols'
import { AnyElement } from '../internal/types'
import { ComputedRef, computed, ref } from '../observable'
import { Disposable, createDisposable } from './disposable'

export class ObservableBounds {
  protected rectRef = ref<DOMRectReadOnly | null>(null)
  protected rectProp(prop: Exclude<keyof DOMRectReadOnly, 'toJSON'>) {
    return computed(() => this.rectRef.value?.[prop] ?? NaN)
  }

  protected topRef: ComputedRef<number> | undefined
  protected rightRef: ComputedRef<number> | undefined
  protected bottomRef: ComputedRef<number> | undefined
  protected leftRef: ComputedRef<number> | undefined
  protected widthRef: ComputedRef<number> | undefined
  protected heightRef: ComputedRef<number> | undefined
  protected resizeEffect: Disposable | undefined
  protected observedElement: AnyElement | null = null
  protected observer: ResizeObserver | null = null
  protected locked = false

  protected observe(element: AnyElement) {
    this.rectRef.value = element.getBoundingClientRect()
    const observer = new ResizeObserver(() => {
      if (!this.locked) {
        this.rectRef.value = element.getBoundingClientRect()
      }
    })

    observer.observe(element)

    const hostProps = kAlienHostProps(element)!
    this.resizeEffect = hostProps.addEffect(
      createDisposable([], observer.disconnect, observer)
    )
  }

  get x() {
    return this.left
  }
  get y() {
    return this.top
  }
  get top() {
    return (this.topRef ||= this.rectProp('top')).value
  }
  get right() {
    return (this.rightRef ||= this.rectProp('right')).value
  }
  get bottom() {
    return (this.bottomRef ||= this.rectProp('bottom')).value
  }
  get left() {
    return (this.leftRef ||= this.rectProp('left')).value
  }
  get width() {
    return (this.widthRef ||= this.rectProp('width')).value
  }
  get height() {
    return (this.heightRef ||= this.rectProp('height')).value
  }

  toJSON() {
    return this.rectRef.value?.toJSON()
  }

  setElement(element: AnyElement | null) {
    if (this.locked) return
    if ((this.observedElement = element)) {
      this.observe(element)
    } else {
      this.resizeEffect?.dispose()
      this.resizeEffect = undefined
    }
  }

  lock(flag: boolean) {
    if (flag === this.locked) return
    this.locked = flag

    if (this.locked) {
      this.resizeEffect?.dispose()
      this.resizeEffect = undefined
    } else if (this.observedElement) {
      this.observe(this.observedElement)
    }
  }

  dispose() {
    this.setElement(null)
  }
}
