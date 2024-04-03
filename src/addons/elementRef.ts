import { AlienEffects } from '../core/effects'
import { AnyElement } from '../internal/types'
import { JSX } from '../types'

export class ElementRef<Element extends AnyElement> implements JSX.ElementRef {
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
