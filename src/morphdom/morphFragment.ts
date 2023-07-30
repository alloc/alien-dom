import { AlienComponent } from '../internal/component'
import { updateParentFragment } from '../internal/fragment'
import { kAlienFragmentKeys, kAlienFragmentNodes } from '../internal/symbols'
import { AnyDeferredNode } from '../jsx-dom/node'
import { ResolvedChild } from '../jsx-dom/resolveChildren'
import { FromParentNode, morphChildren } from './morphChildren'

export function morphFragment(
  fromFragment: DocumentFragment,
  toFragment: AnyDeferredNode,
  component?: AlienComponent | null
) {
  const fromNodes = kAlienFragmentNodes(fromFragment)!
  const lastFromNode = fromNodes.at(-1)

  const fromKeyLookup = new Map(
    kAlienFragmentKeys(fromFragment)!.map((key, index) => [
      fromNodes[index],
      key,
    ])
  )

  const fromParentNode = new FromParentFragment(fromNodes)
  morphChildren(
    fromParentNode,
    toFragment.children as ResolvedChild[],
    component,
    // Child nodes of a fragment may have their positional keys replaced by
    // their actual parent node, so we need to use the fragment's key cache.
    fromNode => fromKeyLookup.get(fromNode),
    // Avoid using the native ".nextSibling" accessor, since that doesn't
    // respect the fragment's end boundary.
    fromNode => {
      if (fromNode !== lastFromNode) {
        return fromNode.nextSibling
      }
      return null
    }
  )

  const toNodes = [fromParentNode.header, ...fromParentNode.childNodes]
  updateParentFragment(fromFragment, fromNodes, toNodes)
  kAlienFragmentNodes(fromFragment, toNodes)

  return fromFragment
}

class FromParentFragment implements FromParentNode {
  header: ChildNode
  childNodes: ChildNode[]
  constructor(childNodes: ChildNode[]) {
    this.header = childNodes[0]
    this.childNodes = childNodes.slice(1)
  }
  get firstChild() {
    return this.childNodes[0] || null
  }
  insertBefore(node: ChildNode, nextNode: ChildNode) {
    const nextNodeIndex = this.childNodes.indexOf(nextNode)
    this.childNodes.splice(nextNodeIndex, 0, node)
    nextNode.before(node)
  }
  appendChild(node: ChildNode) {
    const lastChild = this.childNodes.at(-1)!
    this.childNodes.push(node)
    lastChild.after(node)
  }
}
