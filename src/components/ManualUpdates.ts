import type { JSX } from '../types/jsx'
import { Fragment } from '../jsx-dom/jsx-runtime'
import { markPureComponent } from '../functions/markPureComponent'

export function ManualUpdates({
  children,
}: {
  children: JSX.Children
}): JSX.Element {
  return Fragment({
    manualUpdates: true,
    children,
  }) as any
}

markPureComponent(ManualUpdates)
