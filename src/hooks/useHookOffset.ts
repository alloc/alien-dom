import { isFunction } from '@alloc/is'
import { currentComponent } from '../internal/global'

/**
 * For conditional hooks, the `useHookOffset` function can be used in the
 * alternate branch to ensure that the hook index is consistent between the two
 * branches.
 *
 * Note: This approach is **fragile** and should be used sparingly, but it's
 * very useful for custom hooks whose behavior is flexible based on input
 * parameters.
 *
 * Built-in hooks like `useState`, `useMemo`, and `useComputed` require an
 * offset of 1, while `useRef`, `useEffect`, and `useObserver` require an offset
 * of 2. For other hooks, you must look at their implementation to calculate the
 * required offset. Statements like `component.nextHookIndex++` also increase
 * the required offset (see `useState` for an example).
 */
export function useHookOffset(offset: number) {
  const component = currentComponent.get()!
  for (let i = 0; i < offset; i++) {
    const index = component.nextHookIndex + i
    const hook = component.hooks[index]
    if (hook && isFunction(hook.dispose)) {
      hook.dispose()
    }
    component.hooks[index] = undefined
  }
  component.nextHookIndex += offset
}
