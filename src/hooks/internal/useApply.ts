import { expectCurrentComponent } from '../../internal/global'

/**
 * An internal hook for applying mutations after a render is completed. This
 * hook is stateless, so it can be wrapped in conditions, etc.
 */
export function useApply(apply: () => void) {
  const component = expectCurrentComponent()
  component.newEffects.run(apply)
}
