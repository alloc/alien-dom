import { Node, Plugin } from 'nebu'
import { ESTree } from 'nebu/dist/types'

const plugin: Plugin = {
  Program(program) {
    // Gather the "alien-dom" exports used by this module.
    let alienDomImports = new Set<string>()

    for (const node of program.body) {
      if (node.isImportDeclaration() && node.source.value == 'alien-dom') {
        for (const specifier of node.specifiers) {
          alienDomImports.add(specifier.local.name)
        }
      }
    }
    if (alienDomImports.has('selfUpdating')) {
      program.unshift(
        'body',
        `import {derefElement as __deref, refElement as __ref} from 'alien-dom'\n`
      )

      let nextId = 0

      const findSelfUpdating = (
        path: Node<ESTree.ArrowFunctionExpression | ESTree.FunctionExpression>
      ) => {
        if (!path.parent.isCallExpression()) {
          return
        }
        const { callee } = path.parent
        if (callee.isIdentifier() && callee.name == 'selfUpdating') {
          const componentFn = path
          const refs: Record<string, number> = {}

          const hasKeyProp = (path: Node<ESTree.JSXOpeningElement>) => {
            return path.attributes.some(
              attr =>
                attr.isJSXAttribute() &&
                attr.name.isJSXIdentifier() &&
                attr.name.name == 'key'
            )
          }

          const swapElementRefs = (path: Node<ESTree.JSXOpeningElement>) => {
            if (path.name.isJSXIdentifier()) {
              const tagName = path.name.name

              // For custom components, we can't know if the component
              // is self-updating at compile time (at least not
              // trivially). By setting the `key` prop (which is
              // normally dropped by jsx-dom for React parity), we can
              // signal that the original element should be returned if
              // the component does happen to be self-updating.
              if (/^[^a-z]/.test(tagName)) {
                if (hasKeyProp(path)) {
                  return // The `key` prop is dynamic.
                }
                path.push('attributes', ` key=":${nextId++}"`)
                return
              }
            }

            // Assigning a JSX element to a variable. In this case, we
            // need to intercept the assignment so the render pass is
            // bound to the original element (created in the initial
            // render). This prevents callbacks from closing over the
            // new element, which only serves as an update to be applied
            // by morphdom to the original element.
            const grandParent = path.parent.parent
            if (
              grandParent.isVariableDeclarator() &&
              grandParent.id.isIdentifier()
            ) {
              if (hasKeyProp(path)) {
                return // The `key` prop is dynamic.
              }

              const id = nextId++
              refs[grandParent.id.name] = id

              // Register the new element and return the original element.
              path.parent.before(`__ref(${id}, `)
              path.parent.after(`)`)
            }
          }

          const swapElementDerefs = (
            path: Node<ESTree.JSXExpressionContainer>
          ) => {
            const nearestFunction = findNearestFunction(path)!
            if (nearestFunction == componentFn) {
              const container = path
              container.process({
                Identifier(path) {
                  if (
                    path.parent.type == 'MemberExpression' &&
                    path.ref == 'object'
                  ) {
                    return // Skip element property access.
                  }
                  const nearestContainer = path.findParent(parent =>
                    parent.isJSXExpressionContainer()
                  )
                  if (nearestContainer != container) {
                    return // Skip nested JSX expressions.
                  }
                  const id = refs[path.name]
                  if (id != null) {
                    // Ensure the new element is used, so that we can
                    // preserve the parent of the original element.
                    path.replace(`__deref(${id})`)
                  }
                },
              })
            }
          }

          path.process({
            JSXOpeningElement: swapElementRefs,
            JSXExpressionContainer: swapElementDerefs,
          })

          // HACK: Self-updating components cannot be nested, so we can
          // stop descending at this point. To do this, mark the path as
          // removed, even though it's not.
          path.removed = true
        }
      }

      program.process({
        ArrowFunctionExpression: findSelfUpdating,
        FunctionExpression: findSelfUpdating,
      })
    }

    const jsxThunkParents = new Map<Node<ESTree.JSXElement>, JSXThunkParent>()
    program.process({
      JSXElement(path) {
        collectThunkParents(path, jsxThunkParents)
      },
    })

    // Wrap the children of each thunk parent in a closure.
    jsxThunkParents.forEach((thunk, path) => {
      // thunk.attributes.forEach(attr => {
      //   const value = attr.value as Node<ESTree.JSXExpressionContainer>
      //   value.expression.before(`() => `)
      // })

      if (thunk.children.size) {
        // TODO: wrap all children in one thunk?
        path.children.forEach((child, i, children) => {
          if (thunk.children.has(child)) {
            if (child.isJSXExpressionContainer()) {
              child.expression.before(`() => `)
              return
            }
            // HACK: we can't do this the easy way, due to a nebu bug
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

function findNearestFunction(path: Node): Node | undefined {
  let nearestFunction: Node | undefined
  for (
    nearestFunction = path.parent;
    nearestFunction;
    nearestFunction = nearestFunction.parent
  ) {
    if (
      nearestFunction.isFunctionDeclaration() ||
      nearestFunction.isFunctionExpression() ||
      nearestFunction.isArrowFunctionExpression()
    ) {
      break
    }
  }
  return nearestFunction
}

function isHostElement(node: Node<ESTree.JSXElement>) {
  const { openingElement } = node
  if (!openingElement.name.isJSXIdentifier()) {
    return false
  }
  const tagName = openingElement.name.name
  return /^[a-z]/.test(tagName)
}

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
  // Host elements cannot be thunk parents.
  if (isHostElement(jsxPath)) {
    return false
  }

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

function isFunctionNode(
  path: Node
): path is Node<
  | ESTree.FunctionExpression
  | ESTree.ArrowFunctionExpression
  | ESTree.FunctionDeclaration
> {
  return (
    path.isFunctionExpression() ||
    path.isArrowFunctionExpression() ||
    path.isFunctionDeclaration()
  )
}

export default plugin
