import type { AlienMountEffects } from '../core/effects'
import type { JSX } from '../types/jsx'
import type { ElementTags } from './component'
import type { FragmentKeys, FragmentNodes } from './fragment'
import { ElementThunkResult } from './fromElementThunk'
import type { HostProps } from './hostProps'
import { bindPrivateSymbol, definePrivateSymbol } from './privateSymbol'

export const kAlienEffects = definePrivateSymbol<AlienMountEffects>('effects')
export const kAlienElementKey =
  definePrivateSymbol<JSX.ElementKey>('elementKey')
export const kAlienElementPosition =
  definePrivateSymbol<JSX.ElementKey>('elementPosition')
export const kAlienElementTags = definePrivateSymbol<ElementTags>('elementTags')
export const kAlienFragmentKeys =
  definePrivateSymbol<FragmentKeys>('fragmentKeys')
export const kAlienFragmentNodes =
  definePrivateSymbol<FragmentNodes>('fragmentNodes')
export const kAlienHostProps = definePrivateSymbol<HostProps>('hostProps')
export const kAlienInitialContext = definePrivateSymbol<any>('initialContext')
export const kAlienMemo = definePrivateSymbol<boolean>('memo')
export const kAlienParentFragment = definePrivateSymbol<
  DocumentFragment | undefined
>('parentFragment')
export const kAlienRenderFunc =
  definePrivateSymbol<(props: any) => any>('renderFunc')
export const kAlienStateless = definePrivateSymbol<boolean>('stateless')
export const kAlienThunkResult =
  definePrivateSymbol<ElementThunkResult>('thunkResult')
export const kAlienUnmountHandler =
  definePrivateSymbol<() => void>('unmountHandler')

// The most used symbols get their own accessors.
export const [getElementKey, setElementKey] =
  bindPrivateSymbol(kAlienElementKey)
export const [getElementPosition, setElementPosition] = bindPrivateSymbol(
  kAlienElementPosition
)
export const [getElementTags, setElementTags] =
  bindPrivateSymbol(kAlienElementTags)
export const [getFragmentKeys, setFragmentKeys] =
  bindPrivateSymbol(kAlienFragmentKeys)
export const [getFragmentNodes, setFragmentNodes] =
  bindPrivateSymbol(kAlienFragmentNodes)
export const [getHostProps, setHostProps] = bindPrivateSymbol(kAlienHostProps)
export const [getParentFragment, setParentFragment] =
  bindPrivateSymbol(kAlienParentFragment)
