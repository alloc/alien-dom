import type { AlienEffects } from '../effects'
import type { JSX } from '../types/jsx'
import type { ElementTags } from './component'
import type { FragmentKeys, FragmentNodes } from './fragment'
import type { HostProps } from './hostProps'
import { createSymbolProperty } from './symbolProperty'

export const kAlienEffects = createSymbolProperty<AlienEffects>('effects')
export const kAlienElementKey =
  createSymbolProperty<JSX.ElementKey>('elementKey')
export const kAlienElementPosition =
  createSymbolProperty<JSX.ElementKey>('elementPosition')
export const kAlienElementTags =
  createSymbolProperty<ElementTags>('elementTags')
export const kAlienFragmentKeys =
  createSymbolProperty<FragmentKeys>('fragmentKeys')
export const kAlienFragmentNodes =
  createSymbolProperty<FragmentNodes>('fragmentNodes')
export const kAlienHostProps = createSymbolProperty<HostProps>('hostProps')
export const kAlienManualUpdates =
  createSymbolProperty<boolean>('manualUpdates')
export const kAlienMemo = createSymbolProperty<boolean>('memo')
export const kAlienParentFragment = createSymbolProperty<
  DocumentFragment | undefined
>('parentFragment')
export const kAlienPureComponent =
  createSymbolProperty<boolean>('pureComponent')
export const kAlienRenderFunc =
  createSymbolProperty<(props: any) => any>('renderFunc')
export const kAlienSelfUpdating = createSymbolProperty<any>('selfUpdating')
export const kAlienThunkResult =
  createSymbolProperty<JSX.Children>('thunkResult')
