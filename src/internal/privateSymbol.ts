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
    (target: any): T | undefined => getPrivate(target, property),
    (target: any, value: T | undefined) => setPrivate(target, property, value),
  ] as const

/** Check if a private symbol is defined on a target object. */
export const hasPrivate = (target: any, property: PrivateSymbol<any>) =>
  target.hasOwnProperty(property)

/** Access the current value of a private symbol on a target object. */
export const getPrivate = <T>(
  target: any,
  property: PrivateSymbol<T>
): T | undefined =>
  // Ensure the property is defined on the target directly, so we can avoid a
  // prototype lookup when the property is undefined.
  target.hasOwnProperty(property) ? target[property] : undefined

/** Set the value of a private symbol on a target object. */
export const setPrivate = <T>(
  target: any,
  property: PrivateSymbol<T>,
  value: T | undefined
) =>
  Object.defineProperty(target, property, {
    value,
    configurable: true,
  })
