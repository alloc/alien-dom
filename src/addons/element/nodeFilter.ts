import { isFunction } from '@alloc/is'
import { isNode } from '../../functions/typeChecking'
import { canMatch } from '../../internal/duck'
import { AlienNodeFilter } from './types'

/**
 * Of the given nodes, return the ones that match the given selector.
 */
export function nodeFilter<T extends Node>(
  nodes: NodeListOf<T> | readonly T[],
  filter: AlienNodeFilter<T>
): T[]

export function nodeFilter<T extends Node>(
  node: T,
  filter: AlienNodeFilter<T>
): T | null

export function nodeFilter<
  T extends Node,
  Nodes extends T | NodeListOf<T> | readonly T[]
>(nodes: Nodes, filter: AlienNodeFilter<T>): Nodes

export function nodeFilter<T extends Node>(
  nodes: T | NodeListOf<T> | readonly T[],
  filter: AlienNodeFilter<T>
) {
  if (isNode(nodes)) {
    if (isFunction(filter)) {
      return filter(nodes) ? nodes : null
    }
    return canMatch(nodes) && nodes.matches(filter) ? nodes : null
  }
  if (nodes instanceof NodeList) {
    nodes = Array.from(nodes)
  }
  return nodes.filter(node => {
    return isFunction(filter)
      ? filter(node)
      : canMatch(node) && node.matches(filter)
  })
}
