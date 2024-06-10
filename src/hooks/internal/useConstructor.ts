import { expectCurrentComponent } from '../../internal/global'

export interface DisposableHook {
  /**
   * When defined, the `dispose` property tells the runtime that it's okay to
   * clear the hook state when a component is hot-reloaded.
   */
  dispose?: boolean | (() => void) | void
}

/**
 * A low-level hook intended for use by other hooks only. It initializes an
 * object with the `new` operator and no arguments. The caller is expected to
 * use `depsHaveChanged` or `useDepsArray` to provide support for dependency
 * arrays.
 *
 * 🪝 This hook adds 1 to the hook offset.
 */
export function useConstructor<T extends object & DisposableHook>(
  T: new () => T
): T {
  const component = expectCurrentComponent()
  const index = component.nextHookIndex++
  return (component.hooks[index] ||= new T())
}
