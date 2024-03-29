import { Falsy } from '@alloc/types'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { isElement, isFragment } from '../functions/typeChecking'
import { AlienComponent } from '../internal/component'
import { currentComponent } from '../internal/global'
import { lastValue } from '../internal/util'
import { JSX } from '../types/jsx'
import { useMicrotask } from './useMicrotask'
import { useState } from './useState'

export type EffectResult = (() => void) | void
export type EffectCallback<State = {}> = (
  context: EffectContext<State>
) => EffectResult
export type EffectContext<State = {}> = State & {
  get rootNode(): JSX.Element | Comment
  get rootElement(): JSX.Element
  get parentNode(): JSX.Element
}

/**
 * Run an effect after the component is mounted. The effect may rerun on a rerender
 * if the dependencies have changed. The effect is disposed before the next run.
 *
 * 🪝 This hook adds 2 to the hook offset.
 */
export function useEffect<State = {}>(
  effect: EffectCallback<State> | Falsy,
  deps: readonly any[]
) {
  const component = lastValue(currentComponent)!
  const hook = useState(UseEffect, deps, component)
  useMicrotask(() => {
    hook.effect = effect
    hook.deps = deps
    hook.run()
  }, depsHaveChanged(deps, hook.deps))
}

class UseEffect {
  constructor(public deps: readonly any[], public component: AlienComponent) {}
  effect: EffectCallback<any> | Falsy = undefined
  context: EffectContext | undefined = undefined
  dispose: (() => void) | void = undefined

  run() {
    const { effect, component } = this
    if (!effect) {
      return
    }
    if (effect.length > 0) {
      const rerun = this.run.bind(this)
      this.context ||= {
        get rootNode(): any {
          component.rootNodeCallbacks ||= new Set()
          component.rootNodeCallbacks.add(rerun)

          const node = component.rootNode!
          return isFragment(node) ? node.firstChild : node
        },
        get rootElement() {
          const { rootNode } = this
          if (!isElement(rootNode)) {
            throw Error('Expected rootNode to be an element')
          }
          return rootNode
        },
        // TODO: trigger effect on parentNode change
        get parentNode() {
          return component.rootNode!.parentNode as any
        },
      }
    }
    this.dispose?.()
    this.dispose = effect(this.context!)
  }
}

/**
 * Useful for hooks that wrap `useEffect`. It ensures the `EffectContext` is
 * only created if the given `effect` needs it, while allowing the wrapper hook
 * to do its thing.
 *
 * 🪝 This hook adds 2 to the hook offset.
 */
export function useWrappedEffect(
  effect: EffectCallback | Falsy,
  wrapper: (effect: () => EffectResult) => EffectResult,
  deps: readonly any[]
): void {
  useEffect(
    effect &&
      (effect.length > 0
        ? context => wrapper(() => effect(context))
        : () => wrapper(effect as () => EffectResult)),
    deps
  )
}
