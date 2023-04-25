import type { JSX } from '../types/jsx'
import { Fragment } from '../jsx-dom/jsx-runtime'

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
