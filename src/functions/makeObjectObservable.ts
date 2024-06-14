import { Ref, ref } from '../core/observable'
import {
  definePrivateSymbol,
  getPrivate,
  setPrivate,
} from '../internal/privateSymbol'
import { defineProperty, keys } from '../internal/util'
import { attachRef } from './attachRef'

/**
 * An object with observable properties.
 *
 * The result type of `makeObjectObservable`.
 */
export type Observable<T extends object> = T & {
  /**
   * Get the underlying `Ref` of an observable property.
   *
   * This method is useful for binding a property to a JSX attribute.
   */
  bind<K extends keyof T>(key: K): Ref<T[K]>
}

/**
 * Make every property in a plain object observable.
 */
export function makeObjectObservable<T extends object>(
  object: T
): Observable<T> {
  const boundRefs = {} as Record<keyof T, Ref>
  setPrivate(object, kBoundRefs, boundRefs)

  for (const key of keys<Omit<T, 'bind'>>(object)) {
    attachRef(object, key, (boundRefs[key] = ref(object[key])))
  }

  defineProperty(object, 'bind', { value: getBoundRef })
  return object as any
}

const kBoundRefs = definePrivateSymbol<Record<keyof any, Ref>>('boundRefs')

function getBoundRef(this: any, key: keyof any) {
  return getPrivate(this, kBoundRefs)![key]
}
