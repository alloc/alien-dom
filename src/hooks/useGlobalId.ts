import { currentComponent } from '../internal/global'

let nextId = Number.MIN_SAFE_INTEGER

/**
 * By default, this hook returns a stable guid. If the `unstable`
 * argument is true, the guid will change on every render. If the
 * `unstable` argument is later changed to false, the last used guid
 * will remain stable.
 *
 * It can be used to conditionally bust caches (i.e. for debugging or
 * development purposes), but it's also good for generating a stable
 * guid.
 *
 * The guid is guaranteed to be truthy. To avoid overflow issues, the
 * guid starts at `Number.MIN_SAFE_INTEGER` instead of 1, but 0 is
 * always skipped. If this approach isn't good enough, you can pass a
 * custom `generateId` function.
 */
export function useGlobalId(unstable?: boolean): number

export function useGlobalId<Id extends string | number = number>(
  unstable: boolean | null | undefined,
  generateId: () => Id
): Id

export function useGlobalId(
  unstable?: boolean | null,
  generateId?: () => string | number
) {
  const component = currentComponent.get()!
  const index = component.nextHookIndex++
  const cachedId = component.hooks[index]
  return unstable || !cachedId
    ? (component.hooks[index] = generateId
        ? generateId()
        : (nextId += nextId === -1 ? 2 : 1))
    : cachedId
}
