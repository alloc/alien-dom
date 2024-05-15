import { DelegatedElementRef, ElementRef } from '../addons/elementRef'
import { AnyElement } from '../internal/types'
import { useState } from './useState'

export const useElementMap = <K, T extends AnyElement = AnyElement>() =>
  useState(ElementMap<K, T>)

export class ElementMap<Key, Element extends AnyElement = AnyElement> {
  private map = new Map<Key, ElementRef<Element>>()

  /**
   * Get the element at the given key. Returns `null` if the key is not found.
   */
  get(key: Key) {
    const ref = this.map.get(key)
    return ref?.element ?? null
  }

  /**
   * Get an element ref to hold an element for the given key. Pass the result as
   * the `ref` prop of the JSX element whose DOM node you need a reference to.
   */
  bind(key: Key) {
    return this.map.get(key) || new DelegatedElementRef(this as any, key)
  }

  protected attach(_element: Element, ref: DelegatedElementRef<Element>) {
    this.map.set(ref.key, ref)
  }
  protected detach(_element: Element, ref: DelegatedElementRef<Element>) {
    this.map.delete(ref.key)
  }
}
