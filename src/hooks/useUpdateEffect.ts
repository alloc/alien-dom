import { Falsy } from '@alloc/types'
import { EffectCallback, useEffect } from './useEffect'

/**
 * Shorthand for `useEffect` with a `!isFirstRun` check inside the effect.
 */
export function useUpdateEffect<State = {}>(
  effect: EffectCallback<State> | Falsy,
  deps?: readonly any[]
) {
  useEffect<State>(
    effect &&
      (ctx => {
        if (!ctx.isFirstRun) {
          return effect(ctx)
        }
      }),
    deps
  )
}
