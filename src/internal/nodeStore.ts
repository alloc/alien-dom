import { AnyDeferredNode } from '../jsx-dom/node'
import { JSX } from '../types/jsx'

/**
 * A "node store" is responsible for memoization of DOM nodes by their JSX
 * element keys. It also stores any pending updates to existing DOM nodes.
 */
export interface NodeStore {
  getNodeForKey: (
    key: JSX.ElementKey
  ) => ChildNode | DocumentFragment | undefined
  setNodeForKey: (
    key: JSX.ElementKey,
    node: ChildNode | DocumentFragment
  ) => void
  getNodeUpdateForKey: (key: JSX.ElementKey) => AnyDeferredNode | undefined
  setNodeUpdateForKey: (key: JSX.ElementKey, update: AnyDeferredNode) => void
}
