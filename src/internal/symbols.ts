import type { ElementTags } from './component'
import type { AlienEffects } from '../effects'
import type { ElementKey } from '../types/attr'
import type { FunctionComponent } from '../types/component'
import { createSymbolProperty } from './symbolProperty'

export const kAlienEffects = createSymbolProperty<AlienEffects>('effects')
export const kAlienElementKey = createSymbolProperty<ElementKey>('elementKey')
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
export const kAlienRenderFunc =
  createSymbolProperty<FunctionComponent>('renderFunc')
export const kAlienSelfUpdating = createSymbolProperty<any>('selfUpdating')
export const kAlienThunkResult = createSymbolProperty<any>('thunkResult')
