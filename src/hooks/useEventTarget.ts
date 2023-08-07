import { currentComponent } from '../internal/global'
import { EffectResult, useEffect } from './useEffect'
import { useState } from './useState'

export type EventTargetEffect<Target extends EventTarget = EventTarget> = (
  target: Target | Document
) => EffectResult

/**
 * Create an element ref that attaches an effect when the element is set.
 *
 * If the ref is not attached to a JSX element at render time, the effect will
 * be attached to the `document` instead.
 */
export function useEventTarget<Target extends EventTarget>(
  effect: EventTargetEffect<Target>
) {
  const self = useState(initEventTarget, effect)

  const component = currentComponent.get()!
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
    if (!element) {
      this.dispose?.()
      this.dispose = undefined
      this.enabled = false
      return
    }
    const result = this.enable(element)
    this.enabled = true
    if (result) {
      this.dispose = result
    }
  },
  enabled: false,
  enable,
  dispose: undefined,
})
