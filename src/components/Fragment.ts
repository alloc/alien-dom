import type { JSX } from '../types'
import { appendChild } from '../jsx-dom/appendChild'
import { markPureComponent } from '../functions/markPureComponent'

export function Fragment(props: { children: JSX.Children }): JSX.Element {
  const fragment = document.createDocumentFragment()
  appendChild(props.children, fragment)
  return fragment as any
}

markPureComponent(Fragment)
