import { Node, Plugin } from 'nebu'
import { ESTree } from 'nebu/dist/types'
import { isHostElement, isFunctionNode } from './helpers'

const plugin: Plugin = {
  Program(program) {
    const jsxThunkParents = new Map<Node<ESTree.JSXElement>, JSXThunkParent>()
    program.process({
      JSXElement(path) {
        collectThunkParents(path, jsxThunkParents)
      },
    })

    // Wrap the children of each thunk parent in a closure.
    jsxThunkParents.forEach((thunk, path) => {
      thunk.attributes.forEach(attr => {
        const value = attr.value as Node<ESTree.JSXExpressionContainer>
        value.expression.before(`() => `)
      })

      if (thunk.children.size) {
        path.children.forEach((child, i, children) => {
          if (thunk.children.has(child)) {
            if (child.isJSXExpressionContainer()) {
              child.expression.before(`() => `)
              return
            }
            // HACK: we can't do this the easier way, due to a nebu bug
            const prevChild = children[i - 1]
            if (prevChild && thunk.children.has(prevChild)) {
              prevChild.after(`{() => `)
            } else {
              child.before(`{() => `)
            }
            child.after(`}`)
          }
        })
      }
    })
  },
}

export default plugin

type JSXThunkParent = {
  attributes: Set<Node<ESTree.JSXAttribute>>
  children: Set<Node>
}

// Checks if the given `jsxPath` is nested in another JSX element
// without a closure in between them.
function collectThunkParents(
  jsxPath: Node<ESTree.JSXElement>,
  jsxThunkParents: Map<Node<ESTree.JSXElement>, JSXThunkParent>
) {
  let jsxParent: Node<ESTree.JSXElement> | undefined
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
