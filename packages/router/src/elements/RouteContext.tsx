import {
  ComponentNode,
  createContext,
  EffectContext,
  SpringAnimation,
  useCallbackProp,
  useContext,
  useWrappedEffect,
} from 'alien-dom'
import { MatchResult } from 'path-to-regexp'
import type { Route } from '../objects/Route'

export type RouteEnterEffect = (
  context: EffectContext
) => SpringAnimation | void

export type RouteLeaveEffect = (
  context: EffectContext
) => SpringAnimation | PromiseLike<void> | void

export interface RouteInstance {
  route: Route
  match: MatchResult<Record<string, string>>
  node: ComponentNode
  unmount: () => void
  enterEffects?: (() => SpringAnimation | void)[]
  leaveEffects?: (() => SpringAnimation | PromiseLike<void> | void)[]
}

export const RouteContext = createContext<RouteInstance>()

export function useEnterEffect(effect: RouteEnterEffect) {
  const context = useRouteContext()
  useEffectArray((context.enterEffects ||= []), useCallbackProp(effect))
}

export function useLeaveEffect(effect: RouteLeaveEffect) {
  const context = useRouteContext()
  useEffectArray((context.leaveEffects ||= []), useCallbackProp(effect))
}

function useRouteContext() {
  const context = useContext(RouteContext)
  if (!context) {
    throw new Error('Invalid use outside a Route context')
  }
  return context
}

function useEffectArray<Effect extends (context: EffectContext) => any>(
  array: Effect[],
  effect: Effect
) {
  useWrappedEffect(
    effect,
    effect => {
      array.push(effect as any)
      return () => {
        const index = array.indexOf(effect as any)
        if (index !== -1) {
          array.splice(index, 1)
        }
      }
    },
    [array, effect]
  )
}
