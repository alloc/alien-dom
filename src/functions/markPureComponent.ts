import { kAlienPureComponent } from '../internal/symbols'
import type { FunctionComponent } from '../types/component'

/**
 * Prevent a plain function component from being automatically wrapped
 * with `selfUpdating` when used by a self-updating parent.
 *
 * This is a performance optimization for components that have no side
 * effects and don't mind being re-rendered every time their parent is
 * re-rendered.
 */
export function markPureComponent(component: FunctionComponent<any>) {
  kAlienPureComponent(component, true)
}
