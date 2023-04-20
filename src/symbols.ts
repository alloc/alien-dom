import type { ElementTags } from './internal/component'
import type { AlienHooks } from './hooks'
import type { ElementKey } from './types/attr'

export const setSymbol = (obj: any, key: symbol, value: any) =>
  Object.defineProperty(obj, key, { value, configurable: true })

export function createSymbol<T = unknown>(name: string) {
  const symbol: symbol = Symbol.for('alien:' + name)
  function s(target: any): T | undefined
  function s(target: any, value: T | undefined): void
  function s(target: any, value?: T) {
    if (arguments.length === 1) {
      return target[symbol]
    }
    setSymbol(target, symbol, value)
  }
  s.symbol = symbol
  s.in = (obj: object): boolean => obj.hasOwnProperty(symbol)
  s.get = (obj: object): T | undefined => (obj as any)[symbol]
  return s
}

export const kAlienElementKey = createSymbol<ElementKey>('elementKey')
export const kAlienElementTags = createSymbol<ElementTags>('elementTags')
export const kAlienFragment = createSymbol<ChildNode[]>('fragment')
export const kAlienHooks = createSymbol<AlienHooks>('hooks')
export const kAlienManualUpdates = createSymbol<boolean>('manualUpdates')
export const kAlienNewHooks = createSymbol<AlienHooks>('newHooks')
export const kAlienPlaceholder = createSymbol<boolean>('placeholder')
export const kAlienSelfUpdating = createSymbol<any>('selfUpdating')
export const kAlienThunkResult = createSymbol<any>('thunkResult')
