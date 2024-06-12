import { isPlainObject } from '@alloc/is'
import { peek } from '../core/observable'
import { objectToDeps } from '../functions/objectToDeps'
import { expectCurrentComponent } from '../internal/global'
import { StateInitializer, createState } from '../internal/util'
import { useDepsArray } from './useDepsArray'

/**
 * Create a piece of state that persists between renders. The state is recreated
 * when its `params` change between renders. If the only argument is a plain
 * object, its properties will be used for dependency tracking.
 *
 * Use this over `useMemo` for state that needs to persist between hot reloads.
 *
 * 🪝 This hook adds 2 to the hook offset.
 */
export function useConst<State extends object, Params extends any[]>(
  init: new (...params: Params) => State,
  ...params: Params
): State

export function useConst<State, Params extends any[]>(
  init: (...params: Params) => State,
  ...params: Params
): State

export function useConst(init: StateInitializer, ...params: any[]) {
  const component = expectCurrentComponent()
  const index = component.nextHookIndex++
  const deps =
    params.length === 1 && isPlainObject(params[0])
      ? objectToDeps(params[0])
      : params

  if (useDepsArray(deps)) {
    return (component.hooks[index] = peek(createState, init, params))
  }
  return component.hooks[index]
}
