import { effect as createEffect } from '@preact/signals-core'
import { trackSubscription } from './context'

export { batch, computed, signal as ref, Signal as Ref } from '@preact/signals-core'

export const effect = (compute: () => unknown) => {
  const dispose = createEffect(compute)
  return trackSubscription({ dispose })
}
