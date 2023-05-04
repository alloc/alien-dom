import type { Node } from 'nebu'
import { isHostElement, isFunctionNode } from './helpers'

export type JSXThunkParent = {
  attributes: Set<Node.JSXAttribute>
  children: Set<Node>
}

// Checks if the given `jsxPath` is nested in another JSX element
// without a closure in between them.
export function collectThunkParents(
  jsxPath: Node.JSXElement,
  jsxThunkParents: Map<Node.JSXElement, JSXThunkParent>
) {
  let jsxParent: Node.JSXElement | undefined
  let jsxChildOrAttr: Node = jsxPath

  // Look for nearest JSX element parent, or a closure.
  jsxPath.findParent(parent => {
    if (parent.isJSXElement()) {
      if (!isHostElement(parent)) {
        jsxParent = parent
        return true
      }
    } else if (isFunctionNode(parent)) {
      return true
    }
    // Keep track of the node closest to the JSX parent element.
    if (!parent.isJSXOpeningElement()) {
      jsxChildOrAttr = parent
    }
    return false
  })

  if (jsxParent) {
    const thunkParent = jsxThunkParents.get(jsxParent) || createJSXThunkParent()
    jsxThunkParents.set(jsxParent, thunkParent)

    if (jsxChildOrAttr.isJSXAttribute()) {
      thunkParent.attributes.add(jsxChildOrAttr)
    } else {
      thunkParent.children.add(jsxChildOrAttr)
    }
  }
}

function createJSXThunkParent(): JSXThunkParent {
  return {
    attributes: new Set(),
    children: new Set(),
  }
}
