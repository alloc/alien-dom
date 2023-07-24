import type { AlienEffects } from '../effects'
import type { FunctionComponent } from '../types/component'
import type { JSX } from '../types/jsx'
import type { ElementTags } from './component'
import { createSymbolProperty } from './symbolProperty'

export const kAlienEffects = createSymbolProperty<AlienEffects>('effects')
export const kAlienElementKey =
  createSymbolProperty<JSX.ElementKey>('elementKey')
export const kAlienElementProps =
  createSymbolProperty<Set<string>>('elementProps')
export const kAlienElementTags =
  createSymbolProperty<ElementTags>('elementTags')
export const kAlienFragment = createSymbolProperty<ChildNode[]>('fragment')
export const kAlienManualUpdates =
  createSymbolProperty<boolean>('manualUpdates')
export const kAlienNewEffects = createSymbolProperty<AlienEffects>('newEffects')
export const kAlienParentFragment = createSymbolProperty<
  DocumentFragment | undefined
>('parentFragment')
export const kAlienPlaceholder = createSymbolProperty<ParentNode | ChildNode>(
  'placeholder'
)
export const kAlienPureComponent =
  createSymbolProperty<boolean>('pureComponent')
export const kAlienRefProp =
  createSymbolProperty<Set<JSX.ElementRef>>('refProp')
export const kAlienRefType = Symbol.for('alien:refType')
export const kAlienRenderFunc =
  createSymbolProperty<FunctionComponent>('renderFunc')
export const kAlienSelfUpdating = createSymbolProperty<any>('selfUpdating')
export const kAlienThunkResult =
  createSymbolProperty<JSX.Children>('thunkResult')
