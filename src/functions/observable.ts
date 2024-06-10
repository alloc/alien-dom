import { ReadonlyRef, Ref, computed, ref } from '../core/observable'
import {
  definePrivateSymbol,
  getPrivate,
  setPrivate,
} from '../internal/privateSymbol'
import { defineProperty, keys } from '../internal/util'
import { attachRef } from './attachRef'

/**
 * A decorator for class fields that makes the field observable.
 *
 * If the field is a getter, it's backed by a `ComputedRef` object.
 */
export function observable<Target>(
  target: Target,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
): PropertyDescriptor

/**
 * A decorator for classes that makes every property observable.
 *
 * It also adds a `bind` method to the class, which can be used to bind a
 * property to a JSX attribute.
 */
export function observable<Class extends abstract new (...args: any) => object>(
  target: Class
): {
  new (...args: ConstructorParameters<Class>): Observable<InstanceType<Class>>
}

/** @internal */
export function observable(
  target: any,
  propertyKey?: string | symbol,
  descriptor?: PropertyDescriptor
) {
  // Property decorator
  if (propertyKey != null && descriptor) {
    let createRef: (object: any) => ReadonlyRef
    if (descriptor.get) {
      if (descriptor.set) {
        throw Error('An @observable class field cannot have a setter')
      }
      const { get } = descriptor
      createRef = object => computed(get.bind(object))
    } else {
      createRef = object => ref(object[propertyKey])
    }
    return {
      configurable: true,
      enumerable: true,
      get(this: any) {
        return attachRef(this, propertyKey, createRef(this)).value
      },
    }
  }

  // Class decorator
  return new Function(
    'decorate',
    'Super',
    `return class ${target.name} extends Super {` +
      `  constructor(...args) {` +
      `    super(...args)` +
      `    decorate(this)` +
      `  }` +
      `}`
  )(makeObjectObservable, target)
}

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
