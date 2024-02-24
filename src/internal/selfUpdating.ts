import { ContextStore } from '../context'
import { attachRef } from '../functions/attachRef'
import { ref } from '../observable'
import type { JSX } from '../types/jsx'
import { AlienComponent } from './component'
import { getContext } from './context'
import { currentComponent } from './global'
import { kAlienRenderFunc, kAlienSelfUpdating } from './symbols'
import { lastValue } from './util'

/**
 * Create a self-updating component whose render function can mutate its
 * props to re-render itself. The original element is morphed into the
 * new element (using `morphdom`).
 *
 * The given `render` function must be pure (no side effects), but its
 * event listeners can have side effects. Another exception is that any
 * object created within the render function can be mutated freely.
 */
export function selfUpdating<
  Props extends object,
  Result extends JSX.ChildrenProp
>(Component: (props: Readonly<Props>) => Result): (props: Props) => Result {
  let SelfUpdating = kAlienSelfUpdating(Component)
  if (SelfUpdating) {
    return SelfUpdating
  }

  SelfUpdating = (initialProps: Props): any => {
    const props = {} as Props
    const context = new ContextStore(getContext())

    for (const key in initialProps) {
      const initialValue = initialProps[key]
      attachRef(props, key, ref(initialValue))
    }

    const self = new AlienComponent(
      lastValue(currentComponent),
      SelfUpdating!,
      Component,
      props,
      context
    )

    // Trigger the initial render.
    self.update()

    return self.rootNode
  }

  kAlienRenderFunc(SelfUpdating, Component)
  kAlienSelfUpdating(Component, SelfUpdating)

  return SelfUpdating
}
