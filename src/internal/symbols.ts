import type { ElementTags } from './component'
import type { AlienEffects } from '../effects'
import type { ElementKey } from '../types/attr'
import type { FunctionComponent } from '../types/component'

export const setSymbol = (obj: any, key: symbol, value: any) =>
  Object.defineProperty(obj, key, { value, configurable: true })

export function createSymbol<T = unknown>(name: string) {
  const symbol: symbol = Symbol.for('alien:' + name)
  function s<U extends T>(target: any): U | undefined
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
export const kAlienEffects = createSymbol<AlienEffects>('effects')
export const kAlienManualUpdates = createSymbol<boolean>('manualUpdates')
export const kAlienNewEffects = createSymbol<AlienEffects>('newEffects')
export const kAlienParentFragment = createSymbol<DocumentFragment | undefined>(
  'parentFragment'
)
export const kAlienPlaceholder = createSymbol<ParentNode | ChildNode>(
  'placeholder'
)
export const kAlienPureComponent = createSymbol<boolean>('pureComponent')
export const kAlienRenderFunc = createSymbol<FunctionComponent>('renderFunc')
export const kAlienSelfUpdating = createSymbol<any>('selfUpdating')
export const kAlienThunkResult = createSymbol<any>('thunkResult')
