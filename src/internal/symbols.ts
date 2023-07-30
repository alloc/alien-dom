import type { AlienEffects } from '../effects'
import type { FunctionComponent } from '../types/component'
import type { JSX } from '../types/jsx'
import type { ElementTags } from './component'
import type { HostProps } from './hostProps'
import { createSymbolProperty } from './symbolProperty'

export const kAlienEffects = createSymbolProperty<AlienEffects>('effects')
export const kAlienElementKey =
  createSymbolProperty<JSX.ElementKey>('elementKey')
export const kAlienElementTags =
  createSymbolProperty<ElementTags>('elementTags')
export const kAlienFragmentKeys =
  createSymbolProperty<(JSX.ElementKey | undefined)[]>('fragmentKeys')
export const kAlienFragmentNodes =
  createSymbolProperty<ChildNode[]>('fragmentNodes')
export const kAlienHostProps = createSymbolProperty<HostProps>('hostProps')
export const kAlienManualUpdates =
  createSymbolProperty<boolean>('manualUpdates')
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
export const kAlienThunkResult =
  createSymbolProperty<JSX.Children>('thunkResult')
