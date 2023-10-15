import { currentComponent } from '../internal/global'
import { createGuid } from '../internal/guid'

let nextId = Number.MIN_SAFE_INTEGER

/**
 * By default, this hook returns a stable guid. If the `reset` argument is true,
 * the guid will change on every render. If the `reset` argument is later
 * changed to false, the last used guid will remain stable.
 *
 * It can be used to conditionally bust caches (i.e. for debugging or
 * development purposes), but it's also good for generating a stable guid.
 *
 * The guid is guaranteed to be truthy. To avoid overflow issues, the guid
 * starts at `Number.MIN_SAFE_INTEGER` instead of 1, but 0 is always skipped. If
 * this approach isn't good enough, you can pass a custom `generateId` function.
 */
export function useGlobalId(reset?: boolean): number

export function useGlobalId<Id extends string | number = number>(
  reset: boolean | null | undefined,
  generateId: () => Id
): Id

export function useGlobalId(
  reset?: boolean | null,
  generateId?: () => string | number
) {
  const component = currentComponent.get()!
  return createGuid(
    component.hooks,
    component.nextHookIndex++,
    reset,
    generateId
  )
}
