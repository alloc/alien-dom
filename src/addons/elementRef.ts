import { AlienEffects } from '../core/effects'
import { AnyElement } from '../internal/types'
import { JSX } from '../types'

export class ElementRef<Element extends AnyElement = AnyElement>
  implements JSX.ElementRef
{
  readonly element: Element | null = null
  protected effects: AlienEffects | void = undefined

  setElement(element: Element | null): void {
    if (this.element) {
      if (element === this.element) {
        return
      }
      this.detach?.(this.element)
      this.effects?.disable(true)
    }
    // @ts-ignore
    this.element = element
    if (element) {
      this.effects = this.attach?.(element)
      this.effects?.enable()
    }
  }

  protected attach?(element: Element): AlienEffects | void
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

  protected attach(element: Element): AlienEffects | void {
    return this.delegate.attach?.(element, this)
  }

  protected detach(element: Element): void {
    this.delegate.detach?.(element, this)
  }
}

/**
 * A delegate for `DelegatedElementRef`.
 */
export interface ElementRefDelegate<Element extends AnyElement, DelegateState> {
  attach?(
    element: Element,
    ref: DelegatedElementRef<Element, DelegateState>
  ): AlienEffects | void
  detach?(
    element: Element,
    ref: DelegatedElementRef<Element, DelegateState>
  ): void
}
