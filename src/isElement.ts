import type { JSX } from './jsx-dom/types'

export function isElement(value: any): value is JSX.Element {
  if (value == null) {
    return false
  }
  const { nodeType } = value as { nodeType?: number }
  return (
    nodeType === Node.ELEMENT_NODE || nodeType === Node.DOCUMENT_FRAGMENT_NODE
  )
}
