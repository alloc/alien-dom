import { ElementRef } from '../addons/elementRef'
import { AnyElement } from '../internal/types'
import { useState } from './useState'

export class ElementMap<K, T extends AnyElement = AnyElement> {
  private map = new Map<K, ElementRef<T>>()

  get(key: K) {
    const ref = this.map.get(key)
    return ref?.element ?? null
  }

  bind(key: K) {
    let ref = this.map.get(key)
    if (!ref) {
      ref = new ElementRef<T>()
      this.map.set(key, ref)
    }
    return ref
  }

  // Existence of this method effectively tells the runtime to reset the map
  // after an HMR update.
  protected dispose() {}
}

export const useElementMap = <K, T extends AnyElement = AnyElement>() =>
  useState(ElementMap<K, T>)
