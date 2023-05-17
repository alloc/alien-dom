import type { JSX } from '../types'
import { markPureComponent } from '../functions/markPureComponent'
import { appendChild } from '../jsx-dom/appendChild'
import { isFragment, isNode } from '../internal/duck'

export function Fragment(props: { children: JSX.Children }): JSX.Element {
  if (isNode(props.children) && isFragment(props.children)) {
    return props.children as any
  }
  const fragment = document.createDocumentFragment()
  appendChild(props.children, fragment)
  return fragment as any
}

markPureComponent(Fragment)
