import type { Node, Plugin } from 'nebu'
import { isHostElement, findExternalReferences } from './helpers'
import {
  FunctionNode,
  getComponentName,
  hasElementProp,
  isFunctionNode,
} from './helpers'

export default function (
  state: {
    /**
     * This value is used to prevent key collisions across builds.
     */
    globalNextId: number
  } = {
    globalNextId: 0,
  }
): Plugin {
  return {
    Program(program) {
      const globalId = state.globalNextId++
      let moduleNextId = 0

      const componentFns = new Set<Node>()
      let hasNestedComponent = false

      const handleElementRefs = (path: FunctionNode) => {
        const isSelfUpdating =
          path.parent.isCallExpression() &&
          path.parent.callee.isIdentifier() &&
          path.parent.callee.name === 'selfUpdating'

        if (!isSelfUpdating) {
          const componentName = getComponentName(path)
          if (!componentName) {
            return
          }
        }

        const componentFn = path
        componentFns.add(componentFn)

        const addStaticElementKeys = (path: Node.JSXOpeningElement) => {
          if (!path.name.isJSXIdentifier()) {
            return // Dynamic element types are not supported.
          }

          // Elements within loops and non-component functions must have
          // dynamic keys in order to be reused.
          const nearestFnOrLoop = path.parent.findParent(
            parent =>
              isFunctionNode(parent) ||
              parent.isForStatement() ||
              parent.isWhileStatement() ||
              parent.isDoWhileStatement()
          )
          if (nearestFnOrLoop !== componentFn) {
            return
          }

          if (hasElementProp(path, 'key')) {
            return // Dynamic keys are preserved.
          }

          let skipped = false

          // A key must be defined for elements using a custom component,
          // or else we wouldn't be able to update its props from inside
          // the parent component.
          if (isHostElement(path.parent as Node.JSXElement)) {
            skipped =
              !path.parent.findParent(parent => {
                if (parent === componentFn) {
                  return (skipped = true)
                }
                if (parent.isReturnStatement()) {
                  return (skipped = true)
                }
                if (parent.isJSXElement()) {
                  // It's a reference if the element is passed to a custom
                  // component.
                  skipped = isHostElement(parent)
                  return true
                }
                // It's a reference if the element is assigned to a variable
                // or a function parameter.
                return (
                  parent.isVariableDeclarator() || parent.isCallExpression()
                )
              }) || skipped
          }

          if (!skipped) {
            path.push('attributes', ` key="${globalId}#${moduleNextId++}"`)
          }
        }

        const wrapInlineCallbacks = (path: Node.JSXOpeningElement) => {
          for (const attr of path.attributes) {
            if (attr.isJSXSpreadAttribute()) {
              continue
            }
            attr.value?.process({
              ArrowFunctionExpression(path) {
                const deps = findExternalReferences(path)
                path.before(`__callback("${globalId}#${moduleNextId++}", `)
                path.after(deps.length > 0 ? `, [${deps}])` : `)`)
              },
            })
          }
        }

        path.process({
          JSXOpeningElement(path) {
            addStaticElementKeys(path)
            wrapInlineCallbacks(path)
          },
        })

        const nearestBlock = path.findParent(p => p.isBlockStatement())
        if (nearestBlock?.parent && componentFns.has(nearestBlock.parent)) {
          const wrappedNode = isSelfUpdating ? path.parent : path
          wrappedNode.before(`__nestedTag("${globalId}#${moduleNextId++}", `)
          wrappedNode.after(')')
          hasNestedComponent = true
        }
      }

      program.process({
        ArrowFunctionExpression: handleElementRefs,
        FunctionExpression: handleElementRefs,
        FunctionDeclaration: handleElementRefs,
      })

      if (hasNestedComponent) {
        program.unshift(
          'body',
          `import { registerCallback as __callback, registerNestedTag as __nestedTag } from 'alien-dom'\n`
        )
      }
    },
  }
}
