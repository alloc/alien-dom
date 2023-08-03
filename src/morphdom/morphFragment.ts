import { AlienComponent } from '../internal/component'
import { FragmentNodes, updateParentFragment } from '../internal/fragment'
import { kAlienFragmentKeys, kAlienFragmentNodes } from '../internal/symbols'
import { AnyDeferredNode } from '../jsx-dom/node'
import { ResolvedChild } from '../jsx-dom/resolveChildren'
import { ParentNode, morphChildren } from './morphChildren'

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

  const nodes: FragmentNodes = [fromNodes[0]]
  const keys = kAlienFragmentKeys(toFragment)!

  const fragment = new ParentFragment(fromNodes)
  morphChildren(fragment, toFragment.children as ResolvedChild[], component, {
    // Child nodes of a fragment may have their positional keys replaced by
    // their actual parent node, so we need to use the fragment's key cache.
    getFromKey: fromNode => fromKeyLookup.get(fromNode),
    // Avoid using the native ".nextSibling" accessor, since that doesn't
    // respect the fragment's end boundary.
    getNextSibling: fromNode => {
      if (fromNode !== lastFromNode) {
        return fromNode.nextSibling
      }
      return null
    },
    // This callback helps us preserve the positions of any undefined values in
    // the toFragment's children array, which is crucial for positional keys.
    onChildNode: node => {
      nodes.push(node)
    },
  })

  kAlienFragmentNodes(fromFragment, nodes)
  kAlienFragmentKeys(fromFragment, keys)

  updateParentFragment(fromFragment, fromNodes, nodes)
  return fromFragment
}

class ParentFragment implements ParentNode {
  header: Comment
  childNodes: ChildNode[]
  constructor(childNodes: FragmentNodes) {
    this.header = childNodes[0]
    this.childNodes = childNodes.slice(1).filter(Boolean) as ChildNode[]
  }
  get firstChild() {
    return this.childNodes[0] || null
  }
  appendChild(node: ChildNode) {
    const lastChild = this.childNodes.at(-1)!
    lastChild.after(node)
  }
}
