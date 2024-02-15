import { ElementRef } from '../addons/elementRef'
import { AnyElement } from '../internal/types'
import { at } from '../internal/util'
import { useState } from './useState'

export class ElementArray<T extends AnyElement = AnyElement> extends Array<
  ElementRef<T>
> {
  get(index: number) {
    const ref = at(this, index)
    return ref?.element ?? null
  }
  bind(index: number) {
    return (this[index] ||= new ElementRef<T>())
  }
  // This tells the runtime to reset the array after an HMR update.
  protected dispose() {}
}

export const useElementArray = <T extends AnyElement>() =>
  useState(ElementArray<T>)
