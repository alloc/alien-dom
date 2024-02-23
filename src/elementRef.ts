import { AnyElement } from './internal/types'
import { JSX } from './types'

export abstract class ElementRef<Element extends AnyElement>
  implements JSX.ElementRef
{
  protected element: Element | null = null

  setElement(element: Element | null): void {
    if (this.element) {
      if (element === this.element) {
        return
      }
      this.detach?.(this.element)
    }
    this.element = element
    if (element) {
      this.attach?.(element)
    }
  }

  protected attach?(element: Element): void
  protected detach?(element: Element): void
}
