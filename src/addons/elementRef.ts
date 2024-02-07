import { AnyElement } from '../internal/types'
import { JSX } from '../types'

export class ElementRef<Element extends AnyElement> implements JSX.ElementRef {
  readonly element: Element | null = null

  setElement(element: Element | null): void {
    if (this.element) {
      if (element === this.element) {
        return
      }
      this.detach?.(this.element)
    }
    // @ts-ignore
    this.element = element
    if (element) {
      this.attach?.(element)
    }
  }

  protected attach?(element: Element): void
  protected detach?(element: Element): void
}
