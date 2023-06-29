import { markPureComponent } from '../functions/markPureComponent'
import type { JSX } from '../types/jsx'

const jsxDomType = Symbol.for('jsx-dom:type')

const enum JsxDomType {
  ShadowRoot = 'ShadowRoot',
}

export type ShadowRootContainer = {
  [jsxDomType]: JsxDomType.ShadowRoot
  props: ShadowRootInit
  children: JSX.Element | JSX.Element[]
}

export function ShadowRoot({
  children,
  ...props
}: ShadowRootInit & {
  children: JSX.Element | JSX.Element[]
}): ShadowRootContainer {
  return {
    [jsxDomType]: JsxDomType.ShadowRoot,
    props,
    children,
  }
}

markPureComponent(ShadowRoot)

export function isShadowRoot(el: any): el is ShadowRootContainer {
  return el != null && el[jsxDomType] === JsxDomType.ShadowRoot
}
