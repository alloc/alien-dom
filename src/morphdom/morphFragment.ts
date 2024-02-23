import { isFragment } from '../functions/typeChecking'
import { AlienComponent } from '../internal/component'
import {
  FragmentNodes,
  endOfFragment,
  updateParentFragment,
} from '../internal/fragment'
import { currentComponent } from '../internal/global'
import { kAlienFragmentKeys, kAlienFragmentNodes } from '../internal/symbols'
import { lastValue } from '../internal/util'
import { AnyDeferredNode } from '../jsx-dom/node'
import { ResolvedChild } from '../jsx-dom/resolveChildren'
import { ParentNode, morphChildren } from './morphChildren'

export function morphFragment(
  fromFragment: DocumentFragment,
  toFragment: AnyDeferredNode,
  component: AlienComponent | null = lastValue(currentComponent)
) {
  const fromKeys = kAlienFragmentKeys(fromFragment)!
  const fromNodes = kAlienFragmentNodes(fromFragment)!

  const parentElement = fromNodes[0].parentElement
  for (let i = 1; i < fromNodes.length; i++) {
    const fromNode = fromNodes[i]
    if (fromNode && fromNode.parentElement !== parentElement) {
      fromKeys.splice(i, 1)
      fromNodes.splice(i, 1)
      i--
    }
  }

  const lastFromNode = endOfFragment(fromFragment)
  const fromKeyLookup = new Map()
  fromKeys.forEach((key, index) => {
    if (key !== undefined) {
      fromKeyLookup.set(fromNodes[index], key)
    }
  })

  const nodes: FragmentNodes = [fromNodes[0]]
  const keys = [...kAlienFragmentKeys(toFragment)!]

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
      if (node && isFragment(node)) {
        const childNodes = kAlienFragmentNodes(node)!
        childNodes.forEach((childNode, i) => {
          if (i !== 0) {
            keys.splice(nodes.length, 0, undefined)
          }
          nodes.push(childNode)
        })
      } else {
        nodes.push(node)
      }
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
    const lastChild = lastValue(this.childNodes) || this.header
    if (lastChild !== node) {
      const previousIndex = this.childNodes.indexOf(node)
      if (previousIndex !== -1) {
        this.childNodes.splice(previousIndex, 1)
      }
      this.childNodes.push(node)
      lastChild.after(node)
    }
  }
}
