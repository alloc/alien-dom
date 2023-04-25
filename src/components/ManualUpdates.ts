import type { JSX } from '../types/jsx'
import { markPureComponent } from '../functions/markPureComponent'
import { kAlienManualUpdates } from '../symbols'
import { appendChild } from '../jsx-dom/appendChild'

export function ManualUpdates(props: { children: JSX.Children }): JSX.Element {
  const fragment = document.createDocumentFragment()
  kAlienManualUpdates(fragment, true)
  appendChild(props.children, fragment)
  return fragment as any
}

markPureComponent(ManualUpdates)
