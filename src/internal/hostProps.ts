import { isArray } from '@alloc/is'
import { Disposable, createDisposable } from '../disposable'
import { forEach } from '../jsx-dom/util'
import { ReadonlyRef, observe } from '../observable'
import { JSX } from '../types/jsx'
import { kAlienHostProps } from './symbols'
import { DefaultElement } from './types'

type HostProp = Disposable | Disposable[] | null

export class HostProps extends Map<string, HostProp> {
  refs?: Set<JSX.ElementRef>
  unmappedEffects?: Set<Disposable>

  constructor(readonly node: DefaultElement) {
    super()
    kAlienHostProps(node, this)
  }

  /**
   * When the host node is morphed, any props passed to this method will be
   * nullified unless they exist in the newest props.
   */
  add(prop: string) {
    this.set(prop, null)
  }

  addObserver(
    prop: string,
    ref: ReadonlyRef<any>,
    applyProp: (newValue: any) => void
  ): void {
    const observer = observe(ref, applyProp)
    this.addEffect(prop, observer)
  }

  addEffect(effect: Disposable): Disposable
  addEffect(prop: string, effect: Disposable): void
  addEffect(arg1: string | Disposable, effect?: Disposable): any {
    if (effect) {
      const prop = arg1 as string
      const otherEffect = this.get(prop)
      if (!otherEffect) {
        this.set(prop, effect)
      } else if (isArray(otherEffect)) {
        otherEffect.push(effect)
      } else {
        this.set(prop, [otherEffect, effect])
      }
    } else {
      effect = arg1 as Disposable
      this.unmappedEffects ||= new Set()
      this.unmappedEffects.add(effect)
      return createDisposable([effect], this.destroyEffect, this)
    }
  }

  destroyEffect(effect: Disposable) {
    this.unmappedEffects?.delete(effect)
    effect.dispose()
  }

  unmount() {
    forEach(this.refs, ref => ref.setElement(null))
    forEach(this.unmappedEffects, effect => effect.dispose())

    for (const effects of this.values()) {
      forEach(effects, effect => effect.dispose())
    }
  }
}
