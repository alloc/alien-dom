import { isFunction, isPlainObject } from '@alloc/is'
import { Ref, ref } from '../core/observable'
import { attachRef } from '../functions/attachRef'
import { definePrivateSymbol, getPrivate, setPrivate } from './privateSymbol'
import { createState, defineProperty, keys } from './util'

/**
 * The result type of `createObservable`.
 */
export type Observable<T extends object> = Omit<T, 'bind'> & {
  bind<K extends keyof T>(key: K): Ref<T[K]>
}

const kBoundRefs = definePrivateSymbol<Record<keyof any, Ref>>('boundRefs')

function getBoundRef(this: any, key: keyof any) {
  return getPrivate(this, kBoundRefs)![key]
}

class RefBindings {
  constructor(refs: Record<keyof any, Ref>, context: any) {
    setPrivate(this, kBoundRefs, refs)

    // If the context is not a plain object, assume it's a class instance; in
    // which case, we need to inherit its prototype while also preserving the
    // `RefBindings#bind` method.
    if (!isPlainObject(context)) {
      defineProperty(this, 'bind', { value: this.bind })
      Object.setPrototypeOf(this, context)
    }
  }
  bind(key: keyof any) {
    return getPrivate(this, kBoundRefs)![key]
  }
}

/**
 * Create a new object, using `init` for the initial property values. Create and
 * attach a `Ref` for every property.
 */
export function createObservableState<T extends object>(
  init: T | (() => T)
): Observable<T>
export function createObservableState<T extends object, Params extends any[]>(
  init: (...params: Params) => T,
  params: Params
): Observable<T>
export function createObservableState<T extends object, Params extends any[]>(
  init: T | ((...params: Params) => T),
  params?: Params
) {
  if (isFunction(init)) {
    init = createState(init, params || []) as T
  }
  const boundRefs = {} as Record<keyof T, Ref>

  const result: Observable<T> = isPlainObject(init) ? {} : Object.create(init)
  setPrivate(result, kBoundRefs, boundRefs)

  for (const key of keys<Omit<T, 'bind'>>(init)) {
    attachRef(result, key, (boundRefs[key] = ref(init[key])))
  }

  return result
}
