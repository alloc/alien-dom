import { EffectResult } from '../hooks/useEffect'

export const kElementProxyType = Symbol.for('ElementProxy')

export class InternalElementProxy<T extends Element = any> {
  /** The element that was set. */
  _element: T | null = null
  /**
   * Pending effects that will be called when an element is set. They exist when
   * `onceElementExists` is called before an element has been set.
   */
  _pendingEffects: Set<(element: T) => void> | null = null

  constructor(effect?: (element: T) => EffectResult) {
    if (effect) {
      onceElementExists(this, effect)
    }
  }

  get [kElementProxyType]() {
    return true
  }

  toElement() {
    return this._element
  }

  setElement(element: T | null) {
    const pendingEffects = this._pendingEffects
    this._pendingEffects = null

    this._element = element
    if (element) {
      pendingEffects?.forEach(effect => effect(element))
    }
  }

  // This must be named `dispose` for HMR to clear it on updates.
  dispose() {
    this._pendingEffects = null
  }
}

export function onceElementExists(
  ref: InternalElementProxy<any>,
  effect: (element: any) => EffectResult
) {
  let dispose: EffectResult | undefined
  if (ref._element) {
    return effect(ref._element)
  }
  const pendingEffect = (element: any) => {
    dispose = effect(element)
  }
  const pendingEffects = (ref._pendingEffects ||= new Set())
  pendingEffects.add(pendingEffect)
  return () => {
    pendingEffects.delete(pendingEffect)
    dispose?.()
  }
}
