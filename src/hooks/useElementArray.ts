import { DelegatedElementRef, ElementRef } from '../addons/elementRef'
import { AnyElement } from '../internal/types'
import { at } from '../internal/util'
import { useMemo } from './useMemo'

export const useElementArray = <T extends AnyElement>(deps?: readonly any[]) =>
  useMemo(ElementArray<T>, deps)

export class ElementArray<T extends AnyElement = AnyElement> extends Array<
  ElementRef<T> | undefined
> {
  /**
   * Get the element at the given index. Negative indices are allowed.
   */
  get(index: number) {
    const ref = at(this, index)
    return ref?.element ?? null
  }

  /**
   * Get an element ref to hold an element for the given index. Pass the result
   * as the `ref` prop of the JSX element whose DOM node you need a reference
   * to.
   */
  bind(index: number) {
    // Note that we don't set `this[index]` here. Instead, it will be managed in
    // the attach/detach methods, so that memory is freed when a DOM element is
    // no longer bound to the ref.
    return this[index] || new DelegatedElementRef(this as any, index)
  }

  protected attach(_element: T, ref: DelegatedElementRef<T, number>) {
    this[ref.key] = ref
  }
  protected detach(_element: T, ref: DelegatedElementRef<T, number>) {
    this[ref.key] = undefined
    this.length = lastDefinedIndex(this) + 1
  }
}

function lastDefinedIndex<T>(array: T[]) {
  for (let i = array.length - 1; i >= 0; i--) {
    if (array[i] !== undefined) {
      return i
    }
  }
  return -1
}
