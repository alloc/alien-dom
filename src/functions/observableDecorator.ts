import { computed, ref } from '../core/observable'
import { attachRef } from './attachRef'
import { makeObjectObservable } from './makeObjectObservable'

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
 * property to a JSX attribute. To expose this in TypeScript, you need to extend
 * your class with this interface:
 *
 *     import { Ref } from 'alien-dom'
 *     interface MyClass {
 *       bind<K extends keyof this>(key: K): Ref<this[K]>
 *     }
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
