import { AnyElement } from '../internal/types'
import { JSX } from '../types'

/**
 * An `ElementRef` is attached to a DOM element through a JSX element‘s `ref`
 * prop. It‘s most often used to enact side effects that are tied to the
 * lifecycle of the DOM element (i.e. the side effects will be active from the
 * time the DOM element is mounted to the time it is unmounted).
 *
 * Because the JSX `ref` prop accepts multiple “element refs” in the shape of an
 * array, they can be useful for component hooks that need to attach side
 * effects to DOM elements, removing the need to hoist your JSX elements just to
 * pass them into those hooks.
 */
export class ElementRef<Element extends AnyElement = AnyElement>
  implements JSX.ElementRef
{
  readonly element: Element | null = null
  protected dispose: (() => void) | void = undefined

  setElement(element: Element | null): void {
    if (this.element) {
      if (element === this.element) {
        return
      }
      this.detach?.(this.element)
      this.dispose?.()
    }
    // @ts-ignore
    this.element = element
    if (element) {
      this.dispose = this.attach?.(element)
    }
  }

  /**
   * When this method is called, it means the “element ref” was passed into a JSX
   * element through its `ref` prop and that JSX element is now mounted to the
   * document.
   */
  protected attach?(element: Element): (() => void) | void
  /**
   * When this method is called, it means the DOM element that was attached to
   * this “element ref” is no longer in the document.
   */
  protected detach?(element: Element): void
}

/**
 * Same as `ElementRef` except a delegate (provided to the constructor) is
 * called for the `attach` and `detach` events.
 */
export class DelegatedElementRef<
  Element extends AnyElement = AnyElement,
  Key = any
> extends ElementRef<Element> {
  constructor(
    public delegate: ElementRefDelegate<Element, Key>,
    public key: Key
  ) {
    super()
  }

  protected attach(element: Element): (() => void) | void {
    return this.delegate.attach?.(element, this)
  }

  protected detach(element: Element): void {
    this.delegate.detach?.(element, this)
  }
}

/**
 * A delegate for `DelegatedElementRef`.
 */
export interface ElementRefDelegate<Element extends AnyElement, Key> {
  /**
   * When this method is called, it means the “element ref” was passed into a JSX
   * element through its `ref` prop and that JSX element is now mounted to the
   * document.
   */
  attach?(
    element: Element,
    ref: DelegatedElementRef<Element, Key>
  ): (() => void) | void
  /**
   * When this method is called, it means the DOM element that was attached to
   * this “element ref” is no longer in the document.
   */
  detach?(element: Element, ref: DelegatedElementRef<Element, Key>): void
}
