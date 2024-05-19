import { kAlienNodeType, kShadowRootNodeType } from '../internal/constants'
import { setPrivate } from '../internal/privateSymbol'
import { kAlienStateless } from '../internal/symbols'
import type { ShadowRootNode } from '../jsx-dom/node'
import { resolveChildren } from '../jsx-dom/resolveChildren'
import type { JSX } from '../types/jsx'

export interface ShadowRootProps extends ShadowRootInit {
  children: JSX.ChildrenProp
}

export function ShadowRoot(props: ShadowRootProps): JSX.Element
export function ShadowRoot({ children, ...props }: ShadowRootProps): any {
  return {
    [kAlienNodeType]: kShadowRootNodeType,
    props,
    children: resolveChildren(children),
  } satisfies ShadowRootNode
}

setPrivate(ShadowRoot, kAlienStateless, true)
