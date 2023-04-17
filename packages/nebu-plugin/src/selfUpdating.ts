import type { Node, Plugin } from 'nebu'
import { isHostElement } from './helpers'
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

        path.process({
          JSXOpeningElement: addStaticElementKeys,
        })
      }

      program.process({
        ArrowFunctionExpression: handleElementRefs,
        FunctionExpression: handleElementRefs,
        FunctionDeclaration: handleElementRefs,
      })
    },
  }
}
