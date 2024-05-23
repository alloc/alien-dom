import { onMount } from '../addons/domObserver'
import { expectCurrentComponent } from '../internal/global'
import { getShadowRoot } from '../internal/shadow'
import { useConst } from './useConst'
import { EffectResult, useEffect } from './useEffect'

export type EventTargetEffect<Target extends EventTarget = EventTarget> = (
  target: Target | Document
) => EffectResult

/**
 * Create an element ref that attaches an effect when the element is set.
 *
 * If the ref is not attached to a JSX element at render time, the effect will
 * be attached to the `document` instead.
 *
 * 🪝 This hook adds 2 to the hook offset.
 */
export function useEventTarget<Target extends EventTarget>(
  effect: EventTargetEffect<Target>
) {
  const self = useConst(initEventTarget, effect)

  const component = expectCurrentComponent()
  useEffect(() => {
    if (!self.enabled) {
      return self.enable(component.ownerDocument!)
    }
  }, [])

  return self
}

const initEventTarget = (
  enable: EventTargetEffect<any>
): {
  setElement: (element: HTMLElement | null) => void
  enabled: boolean
  enable: (target: Document | HTMLElement) => EffectResult
  dispose?: () => void
} => ({
  setElement(element) {
    if (this.enabled) {
      this.dispose?.()
      this.dispose = undefined
    }
    this.enabled = element != null
    if (element) {
      if (element.isConnected) {
        const result = this.enable(element)
        if (result) {
          this.dispose = result
        }
      } else {
        const shadowRoot = getShadowRoot()
        this.dispose = onMount(
          element,
          () => this.setElement(element),
          shadowRoot
        ).dispose
      }
    }
  },
  enabled: false,
  enable,
  dispose: undefined,
})
