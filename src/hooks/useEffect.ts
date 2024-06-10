import { Falsy } from '@alloc/types'
import { depsHaveChanged } from '../functions/depsHaveChanged'
import { isElement, isFragment } from '../functions/typeChecking'
import { AlienComponent } from '../internal/component'
import { expectCurrentComponent } from '../internal/global'
import { JSX } from '../types/jsx'
import { DisposableHook, useConstructor } from './useConstructor'

export type EffectResult = ((detail?: { isHotReload?: boolean }) => void) | void

export type EffectCallback<State = {}> = (
  context: EffectContext<State>
) => EffectResult

export type EffectContext<State = {}> = State & {
  get isFirstRun(): boolean
  get rootNode(): JSX.Element | Comment
  get rootElement(): JSX.Element
  get parentNode(): JSX.Element
}

/**
 * Run an effect after the component is mounted. The effect will run again
 * following a rerender when the dependencies have changed (or the `deps`
 * argument was not provided). The effect is disposed before the next run.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function useEffect<State = {}>(
  effect: EffectCallback<State> | Falsy,
  deps?: readonly any[]
) {
  const component = expectCurrentComponent()
  const hook = useConstructor(UseEffect)

  if (depsHaveChanged(deps, hook.deps)) {
    component.newEffects.run(() => {
      hook.component = component
      hook.effect = effect
      hook.deps = deps

      hook.dispose?.()
      hook.dispose = effect ? effect(hook as EffectContext<any>) : undefined
      hook.runs++
    })
  }
}

class UseEffect implements DisposableHook {
  deps?: readonly any[] = undefined
  component: AlienComponent = null!
  effect: EffectCallback<any> | Falsy = undefined
  dispose: (() => void) | void = undefined
  rerun: (() => void) | void = undefined
  runs = 0

  get isFirstRun() {
    return this.runs === 0
  }

  /**
   * Access the root node of the current component. If a fragment or primitive
   * is returned by the component, this will be a `Comment` node. If the root
   * node changes, your effect will rerun.
   */
  get rootNode(): JSX.Element | Comment {
    this.component.rootNodeCallbacks ||= new Set()
    this.component.rootNodeCallbacks.add((this.rerun ||= this.run.bind(this)))

    const node = this.component.rootNode!
    return (isFragment(node) ? node.firstChild : node) as any
  }

  /**
   * Type cast the root node of the current component as a`JSX.Element` object.
   * If the root node changes, your effect will rerun.
   *
   * Note: This accessor is unsafe if the component ever returns a fragment or
   * primitive. In those cases, you'll want to either use `rootNode` instead or
   * check for null.
   */
  get rootElement(): JSX.Element {
    const { rootNode } = this
    return isElement(rootNode) ? rootNode : null!
  }

  /**
   * Access the parent node of the current component.
   *
   * Caveat: If the parent node changes, your effect will not rerun.
   */
  get parentNode(): JSX.Element {
    // TODO: trigger effect on parentNode change
    return this.component.rootNode!.parentNode as any
  }
}

/**
 * Useful for hooks that wrap `useEffect`. It takes care of passing along the `EffectContext` to the wrapped effect.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function useWrappedEffect(
  effect: EffectCallback | Falsy,
  wrapper: (effect: () => EffectResult) => EffectResult,
  deps: readonly any[]
): void {
  useEffect(effect && (context => wrapper(() => effect(context))), deps)
}
