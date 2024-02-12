import { defineProperty } from './utils'

export interface SymbolProperty<T> {
  /** Access the current value */
  <U extends T>(target: any): U | undefined
  /**
   * Set the property with `Object.defineProperty` (which makes the
   * property non-enumerable and non-assignable).
   */
  (target: any, value: T | undefined): void

  readonly symbol: unique symbol
  /** Check if the property exists */
  in: (target: any) => boolean
  /** An accessor pre-bound to the symbol */
  get get(): (target: any) => T | undefined
}

const prototype = Object.getOwnPropertyDescriptors({
  in(obj: object) {
    return obj.hasOwnProperty(this.symbol)
  },
  get get() {
    return (obj: object) => (obj as any)[this.symbol]
  },
} as SymbolProperty<any>)

export function createSymbolProperty<T = unknown>(
  name: string
): SymbolProperty<T> {
  const symbol: symbol = Symbol.for('alien:' + name)
  function symbolProperty(target: any, value?: T) {
    if (arguments.length === 1) {
      return target[symbol]
    }
    defineProperty(target, symbol, {
      value,
      configurable: true,
    })
  }
  symbolProperty.symbol = symbol
  return Object.defineProperties<any>(symbolProperty, prototype)
}
