import { isArray } from '@alloc/is'
import { Disposable } from '../disposable'
import { AlienEffect } from '../effects'
import { forEach } from '../jsx-dom/util'
import { ReadonlyRef, observe } from '../observable'
import { enableEffect, getEffects } from './effects'
import { JSX } from '../types/jsx'
import { kAlienHostProps } from './symbols'
import { DefaultElement } from './types'

/** This observes a `Ref` whose value is applied to a host prop. */
export interface HostPropObserver extends Disposable, AlienEffect {
  args: [ReadonlyRef<any>, string]
}

type HostProp = HostPropObserver | HostPropObserver[] | null

export class HostProps extends Map<string, HostProp> {
  refs?: Set<JSX.ElementRef>
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
    applyProp: (node: DefaultElement, newValue: any) => void
  ): void {
    let firstAppliedValue = ref.peek()

    const effect: any = enableEffect(
      getEffects(this.node),
      (node: DefaultElement, ref: ReadonlyRef) => {
        const value = ref.peek()
        if (value !== firstAppliedValue) {
          applyProp(node, value)
        }
        firstAppliedValue = undefined
        return observe(ref, newValue => {
          applyProp(node, newValue)
        }).destructor
      },
      0,
      this.node,
      [ref, prop]
    )

    const otherEffect = this.get(prop)
    if (!otherEffect) {
      this.set(prop, effect)
    } else if (isArray(otherEffect)) {
      otherEffect.push(effect)
    } else {
      this.set(prop, [otherEffect, effect])
    }
  }

  unmount() {
    forEach(this.refs, ref => ref.setElement(null))

    for (const effects of this.values()) {
      forEach(effects, effect => effect.dispose())
    }
  }
}
