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

export default plugin
