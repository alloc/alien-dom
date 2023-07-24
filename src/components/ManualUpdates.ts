import { markPureComponent } from '../functions/markPureComponent'
import { currentMode } from '../internal/global'
import { kAlienManualUpdates } from '../internal/symbols'
import { appendChild } from '../jsx-dom/appendChild'
import type { JSX } from '../types/jsx'

export function ManualUpdates(props: { children: JSX.Children }): JSX.Element {
  const fragment = document.createDocumentFragment()
  currentMode.push('deref')
  try {
    appendChild(props.children as any, fragment)
  } finally {
    currentMode.pop('deref')
  }

  // If this fragment is the root node of a component, the comment node
  // added here will serve as a placeholder for component updates, in
  // case all other child nodes are dynamically moved elsewhere.
  fragment.prepend(document.createComment(DEV ? 'ManualUpdates' : ''))

  // This prevents `updateFragment` from calling into morphdom.
  kAlienManualUpdates(fragment, true)

  return fragment as any
}

markPureComponent(ManualUpdates)
