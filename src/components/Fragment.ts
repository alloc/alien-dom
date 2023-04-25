import type { JSX } from '../types'
import { kFragmentNodeType } from '../internal/constants'
import { markPureComponent } from '../functions/markPureComponent'
import { appendChild } from '../jsx-dom/appendChild'
import { isElement } from '../jsx-dom/util'

export function Fragment(props: { children: JSX.Children }): JSX.Element {
  if (isElement(props.children, kFragmentNodeType)) {
    return props.children as any
  }
  const fragment = document.createDocumentFragment()
  appendChild(props.children, fragment)
  return fragment as any
}

markPureComponent(Fragment)
