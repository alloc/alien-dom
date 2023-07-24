import type { AlienContext, ContextStore } from '../context'
import { Ref } from '../observable'

/** @internal */
export interface AlienContextMap extends Map<AlienContext, Ref> {
  get<T>(key: AlienContext<T>): Ref<T> | undefined
  set<T>(key: AlienContext<T>, value: Ref<T>): this
}

let currentContext: AlienContextMap = new Map()

/** @internal */
export function forwardContext(context: ContextStore, isRerender?: boolean) {
  const oldValues = new Map(currentContext)
  context.forEach((value, key) => {
    const ref = currentContext.get(key)
    if (isRerender && ref) {
      // If context exists, then we are being re-rendered by a parent,
      // so we want to allow the parent's context to take precedence
      // over the initial context.
      context.set(key, ref)
    } else {
      currentContext.set(key, value)
    }
  })
  return () => {
    context.forEach((_, key) => {
      const oldValue = oldValues.get(key)
      if (oldValue) {
        currentContext.set(key, oldValue)
      } else {
        currentContext.delete(key)
      }
    })
  }
}

export function getContext<T>(context: AlienContext<T>): Ref<T> | undefined

export function getContext(): AlienContextMap

export function getContext<T>(context?: AlienContext<T>): any {
  if (context) {
    return currentContext.get(context)
  }
  return currentContext
}

/**
 * Replace the current value of a context object.
 *
 * The previous ref is returned, so you can restore it later.
 */
export function setContext<T>(
  context: AlienContext<T>,
  value: Ref<T> | undefined
): Ref<T> | undefined

/**
 * Replace all context at once.
 *
 * The previous context is returned, so you can restore it later.
 */
export function setContext(context: AlienContextMap): AlienContextMap

/** @internal */
export function setContext<T>(
  context: AlienContextMap | AlienContext<T>,
  value?: Ref<T> | undefined
): any {
  if (context instanceof Map) {
    const oldContext = currentContext
    currentContext = context
    return oldContext
  }
  const oldValue = currentContext.get(context)
  if (value) {
    currentContext.set(context, value)
  } else {
    currentContext.delete(context)
  }
  return oldValue
}
