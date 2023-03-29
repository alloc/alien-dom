export const jsxDomType: unique symbol

export const enum JsxDomType {
  ShadowRoot = 'ShadowRoot',
}

export type ShadowRootContainer = {
  [jsxDomType]: JsxDomType
  attr: ShadowRootInit
  // ref?: RefObject<ShadowRoot> | ((value: ShadowRoot) => void)
  children: JSX.Element | JSX.Element[]
}
