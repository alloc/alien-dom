const hasOwn = Function.call.bind(Object.prototype.hasOwnProperty) as (
  target: object,
  property: keyof any
) => boolean

export type PrivateSymbol<T> = symbol & { __private: T }

/**
 * Define a private symbol with a given name. Private symbols are useful when
 * you need to attach metadata to an object but you didn't create that object or
 * you're not in control of its prototype.
 */
export const definePrivateSymbol = <T>(name: string): PrivateSymbol<T> =>
  Symbol.for('alien:' + name) as PrivateSymbol<T>

/** Create a getter and setter for a private symbol. */
export const bindPrivateSymbol = <T>(property: PrivateSymbol<T>) =>
  [
    (target: object): T | undefined => getPrivate(target, property),
    (target: object, value: T | undefined) =>
      setPrivate(target, property, value),
  ] as const

/** Check if a private symbol is defined on a target object. */
export const hasPrivate = (target: object, property: PrivateSymbol<any>) =>
  hasOwn(target, property)

/** Access the current value of a private symbol on a target object. */
export const getPrivate = <T>(
  target: object,
  property: PrivateSymbol<T>
): T | undefined =>
  // Ensure the property is defined on the target directly, so we can avoid a
  // prototype lookup when the property is undefined.
  hasOwn(target, property) ? (target as any)[property] : undefined

/** Set the value of a private symbol on a target object. */
export const setPrivate = <T>(
  target: object,
  property: PrivateSymbol<T>,
  value: T | undefined
) =>
  Object.defineProperty(target, property, {
    value,
    configurable: true,
  })
