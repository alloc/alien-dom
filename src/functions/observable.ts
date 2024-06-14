import { Ref, computed, ref } from '../core/observable'
import {
  definePrivateSymbol,
  getPrivate,
  setPrivate,
} from '../internal/privateSymbol'
import { defineProperty, keys } from '../internal/util'
import { attachRef } from './attachRef'

/**
 * A decorator for class fields that makes the field observable.
 */
export function observable<This, Value>(
  target: undefined,
  field: ClassFieldDecoratorContext<This, Value>
): (this: This, value: Value) => Value

/**
 * A decorator for class getters that makes the getter observable. When
 * observed, the getter is only called when a dependency is changed.
 */
export function observable<This, Return>(
  target: () => Return,
  field: ClassGetterDecoratorContext<This, Return>
): (this: This) => Return

/**
 * A decorator for classes that makes every property observable.
 *
 * It also adds a `bind` method to the class, which can be used to bind a
 * property to a JSX attribute.
 */
export function observable<Class extends abstract new (...args: any) => any>(
  target: Class,
  context: ClassDecoratorContext<Class>
): typeof target

/** @internal */
export function observable(
  target: any,
  context:
    | ClassDecoratorContext
    | ClassFieldDecoratorContext
    | ClassGetterDecoratorContext
) {
  const { name, kind } = context

  if (kind === 'class') {
    const { name, length, prototype, ...staticMembers } =
      Object.getOwnPropertyDescriptors(target)

    return Object.defineProperties(
      new Function(
        'decorate',
        'Super',
        `return class ${context.name} extends Super {` +
          `  constructor(...args) {` +
          `    super(...args);` +
          `    decorate(this)` +
          `  }` +
          `}`
      )(makeObjectObservable, target),
      staticMembers
    )
  }

  if (kind === 'getter') {
    // Instance property getter
    return function (this: any) {
      attachRef(this, name, computed(target.bind(this)))
      return this[name]
    }
  }

  // Instance field initializer
  context.addInitializer(function (this: any) {
    attachRef(this, name, ref(this[name]))
  })
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
