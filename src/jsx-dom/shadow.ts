import { createContext } from '../context'
import { markPureComponent } from '../functions/markPureComponent'
import type { JSX } from '../types/jsx'
import {
  kAlienNodeType,
  kShadowRootNodeType,
  type ShadowRootNode,
} from './node'
import { resolveChildren } from './resolveChildren'

export const ShadowRootContext = createContext<ShadowRoot | undefined>()

export function ShadowRoot({
  children,
  ...props
}: ShadowRootInit & {
  children: JSX.Children
}): ShadowRootNode {
  return {
    [kAlienNodeType]: kShadowRootNodeType,
    props,
    children: resolveChildren(children),
  }
}

markPureComponent(ShadowRoot)
