import type { Node, Plugin } from 'nebu'
import { JSXThunkParent, collectThunkParents } from './thunk'
import {
  isHostElement,
  findExternalReferences,
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

      const jsxThunkParents = new Map<Node.JSXElement, JSXThunkParent>()
      const componentFns = new Set<Node>()
      const helpers = new Map<string, string>()

      const createMemo = () => {
        helpers.set('registerObject', '__objectMemo')
        return `__objectMemo("${globalId}#${moduleNextId++}", `
      }

      const createThunk = (memo = true) => (memo ? createMemo() : ``) + `() => `

      const createDeps = (node: Node, memo = true) => {
        if (memo) {
          const { deps, hasPropertyAccess } = findExternalReferences(node)

          // Skip memoizing if property access is used in a JSX child
          // thunk during render.
          if (
            hasPropertyAccess &&
            (node.isJSXElement() || node.parent.parent.isJSXElement())
          ) {
            return ``
          }

          return deps.length > 0
            ? isFunctionNode(node) || node.isJSXElement() || !hasPropertyAccess
              ? `, [${deps}])`
              : // Memoized objects/arrays with property access must
                // use deep equality, so that computed properties aren't
                // accessed twice.
                `, true)`
            : `)`
        }
        return ``
      }

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

        const createMemoizer =
          (context: Node) => (node: AutoMemoizableNode) => {
            const nearestContext = node.findParent(
              parent =>
                parent === context ||
                isObjectNode(parent) ||
                parent.isCallExpression() ||
                parent.isJSXElement()
            )
            if (nearestContext === context) {
              const deps = createDeps(node)
              if (deps) {
                node.before(createMemo())
                node.after(deps)
              }
            }
          }

        const autoMemoizeProps = (openingElement: Node.JSXOpeningElement) => {
          const element = openingElement.parent as Node.JSXElement
          const inlineValues: Node[] = []

          for (const attr of openingElement.attributes) {
            if (!attr.isJSXSpreadAttribute() && attr.value) {
              inlineValues.push(attr.value)
            }
          }

          let firstChild: Node | undefined
          for (const child of element.children) {
            if (child.isJSXText() && !child.value.trim()) {
              continue
            }
            firstChild = child
            break
          }
          if (firstChild?.isJSXExpressionContainer()) {
            inlineValues.push(firstChild)
          }

          const memoize = createMemoizer(element)
          for (const inlineValue of inlineValues) {
            inlineValue.process({
              CallExpression: memoize,
              FunctionExpression: memoize,
              ArrowFunctionExpression: memoize,
              ObjectExpression: memoize,
              ArrayExpression: memoize,
            })
          }
        }

        componentFn.params.forEach(param => {
          const memoize = createMemoizer(param)
          param.process({
            CallExpression: memoize,
            FunctionExpression: memoize,
            ArrowFunctionExpression: memoize,
            ObjectExpression: memoize,
            ArrayExpression: memoize,
          })
        })

        componentFn.process({
          JSXOpeningElement(openingElem) {
            if (
              openingElem.name.isJSXIdentifier() &&
              /^[a-z]/.test(openingElem.name.name)
            ) {
              return // Inline object props (e.g. the "style" prop) are not memoized for host elements.
            }
            // Elements within loops and non-component functions cannot
            // be assigned static keys or have auto-memoized inline
            // callback props.
            const nearestFnOrLoop =
              openingElem.parent.findParent(isFunctionOrLoop)
            if (nearestFnOrLoop !== componentFn) {
              return
            }
            addStaticElementKeys(openingElem)
            autoMemoizeProps(openingElem)
          },
          // Auto-memoize any variables declared during render with
          // function/object/array expressions as values.
          VariableDeclarator(varDeclarator) {
            if (
              varDeclarator.id.isIdentifier() &&
              /^[A-Z]/.test(varDeclarator.id.name)
            ) {
              return // Inline components are wrapped with registerNestedTag instead.
            }
            const nearestFnOrLoop =
              varDeclarator.parent.findParent(isFunctionOrLoop)
            if (nearestFnOrLoop !== componentFn) {
              return
            }
            const memoize = createMemoizer(varDeclarator)
            varDeclarator.process({
              FunctionExpression: memoize,
              ArrowFunctionExpression: memoize,
            })
          },
        })

        const nearestBlock = path.findParent(p => p.isBlockStatement())
        if (nearestBlock?.parent && componentFns.has(nearestBlock.parent)) {
          const wrappedNode = isSelfUpdating ? path.parent : path
          wrappedNode.before(`__nestedTag("${globalId}#${moduleNextId++}", `)
          wrappedNode.after(')')
          helpers.set('registerNestedTag', '__nestedTag')
        }
      }

      program.process({
        ArrowFunctionExpression: handleElementRefs,
        FunctionExpression: handleElementRefs,
        FunctionDeclaration: handleElementRefs,
        JSXElement(path) {
          collectThunkParents(path, jsxThunkParents)
        },
      })

      if (helpers.size) {
        program.unshift(
          'body',
          `import { ${Array.from(
            helpers,
            ([from, alias]) => `${from} as ${alias}`
          ).join(', ')} } from 'alien-dom/dist/helpers.mjs'\n`
        )
      }

      // Wrap the children of each thunk parent in a closure.
      jsxThunkParents.forEach((thunk, path) => {
        const nearestFnOrLoop = path.parent.findParent(isFunctionOrLoop)!
        const needsMemo = componentFns.has(nearestFnOrLoop)

        thunk.attributes.forEach(attr => {
          const value = attr.value as Node.JSXExpressionContainer
          value.expression.before(createThunk(needsMemo))
          value.expression.after(createDeps(value.expression, needsMemo))
        })

        if (thunk.children.size) {
          path.children.forEach((child, i, children) => {
            if (!thunk.children.has(child)) {
              return
            }
            if (child.isJSXExpressionContainer()) {
              const deps = createDeps(child.expression, needsMemo)
              child.expression.before(createThunk(!!deps && needsMemo))
              if (deps) {
                child.expression.after(deps)
              }
            } else {
              const deps = createDeps(child, needsMemo)
              // HACK: we can't do this the easier way, due to a nebu bug
              const prevChild = children[i - 1]
              if (prevChild && thunk.children.has(prevChild)) {
                prevChild.after(`{` + createThunk(!!deps && needsMemo))
              } else {
                child.before(`{` + createThunk(!!deps && needsMemo))
              }
              child.after(deps + `}`)
            }
          })
        }
      })
    },
  }
}

type AutoMemoizableNode =
  | Node.FunctionExpression
  | Node.ArrowFunctionExpression
  | Node.ObjectExpression
  | Node.ArrayExpression
  | Node.CallExpression

function isObjectNode(node: Node) {
  return (
    isFunctionNode(node) ||
    node.isObjectExpression() ||
    node.isArrayExpression()
  )
}

function isFunctionOrLoop(node: Node) {
  return (
    isFunctionNode(node) ||
    node.isForStatement() ||
    node.isWhileStatement() ||
    node.isDoWhileStatement()
  )
}
