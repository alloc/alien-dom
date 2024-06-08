import {
  DelegatedElementRef,
  ElementRef,
  ElementRefDelegate,
} from '../addons/elementRef'
import { AnyElement } from '../internal/types'
import { useConst } from './useConst'

export const useElementMap = <K, T extends AnyElement = AnyElement>() =>
  useConst(ElementMap<K, T>)

export class ElementMap<Key, Element extends AnyElement = AnyElement>
  implements Iterable<[Key, Element]>
{
  private map = new Map<Key, ElementRef<Element>>()

  constructor(public delegate?: ElementRefDelegate<Element, Key>) {}

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

  protected attach(element: Element, ref: DelegatedElementRef<Element>) {
    this.map.set(ref.key, ref)
    this.delegate?.attach?.(element, ref)
  }
  protected detach(element: Element, ref: DelegatedElementRef<Element>) {
    this.map.delete(ref.key)
    this.delegate?.detach?.(element, ref)
  }

  [Symbol.iterator](): Iterator<[Key, Element]> {
    const entries = this.map.entries()
    return {
      next(): IteratorResult<[Key, Element]> {
        const result = entries.next()
        if (result.done) {
          return result
        }
        return {
          done: false,
          value: [result.value[0], result.value[1].element!],
        }
      },
    }
  }
}
