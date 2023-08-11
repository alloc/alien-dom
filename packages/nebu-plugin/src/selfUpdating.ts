import type { Node, Plugin } from 'nebu'
import {
  FunctionNode,
  findExternalReferences,
  getComponentName,
  hasElementProp,
  isFunctionNode,
  isHostElement,
} from './helpers'
import { JSXThunkParent, collectThunkParents } from './thunk'

declare const process: any

export type SelfUpdatingPluginState = {
  /**
   * This value is used to prevent key collisions across builds.
   */
  globalNextId: number
  /**
   * Sets the `displayName` property of any higher-order component to
   * the component's variable name, so the component has a name for
   * debugging purposes.
   */
  ensureComponentNames?: boolean
}

export default function (
  state: SelfUpdatingPluginState = { globalNextId: 0 }
): Plugin {
  const ensureComponentNames =
    state.ensureComponentNames ?? process.env.NODE_ENV !== 'production'

  return {
    Program(program) {
      const globalId = state.globalNextId++
      let moduleNextId = 0

      const jsxThunkParents = new Map<Node.JSXElement, JSXThunkParent>()
      const componentFns = new Set<Node>()
      const helpers = new Map<string, string>()

      const createMemo = (type: 'memo' | 'callback' = 'memo') => {
        const importedName = 'register' + type[0].toUpperCase() + type.slice(1)
        const localName = '__' + importedName
        helpers.set(importedName, localName)
        return `${localName}("${globalId}#${moduleNextId++}", `
      }

      const createElementThunk = (memo: boolean) =>
        (memo ? createMemo('callback') : '') + '() => '

      const createDeps = (node: Node, memo = true) => {
        if (memo) {
          const { deps, hasPropertyAccess, hasFunctionCall } =
            findExternalReferences(node)

          // Skip memoizing if property access is used in a JSX child
          // thunk during render.
          if (
            hasPropertyAccess &&
            (node.isJSXElement() || node.parent.parent.isJSXElement())
          ) {
            return null
          }

          const isCallback = isFunctionNode(node)
          const isElement = node.isJSXElement()

          if (isCallback || isElement || !hasPropertyAccess) {
            return {
              names: deps,
              code: deps.length
                ? `, [${deps}])`
                : isCallback
                ? ')'
                : ', false)',
              needObserver: !isCallback && !isElement && hasFunctionCall,
            }
          }

          // Memoized objects/arrays with property access must use deep
          // equality, so that computed properties aren't accessed twice.
          return {
            names: null,
            code: ')',
            needObserver: false,
          }
        }

        return null
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
          if (
            isHostElement(path.parent as Node.JSXElement) &&
            !hasRefAttribute(path)
          ) {
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
                  parent.isVariableDeclarator() ||
                  parent.isAssignmentExpression() ||
                  parent.isCallExpression()
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
                const type = isFunctionNode(node) ? 'callback' : 'memo'
                if (type === 'memo' && deps.needObserver) {
                  const needParens = node.isObjectExpression()
                  node.before(createMemo() + '() => ' + (needParens ? '(' : ''))
                  node.after((needParens ? ')' : '') + deps.code)
                } else {
                  node.before(createMemo(type))
                  node.after(deps.code)
                }
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
            FunctionExpression: memoize,
            ArrowFunctionExpression: memoize,
          })
        })

        const memoizeVariable = (
          node: Node.VariableDeclarator | Node.AssignmentExpression
        ) => {
          const id = node.isVariableDeclarator() ? node.id : node.left
          if (id.isIdentifier() && /^[A-Z]/.test(id.name)) {
            return // Inline components are wrapped with registerNestedTag instead.
          }

          const nearestFnOrLoop = node.parent.findParent(isFunctionOrLoop)
          if (nearestFnOrLoop !== componentFn) {
            return
          }

          const memoize = createMemoizer(node)
          node.process({
            FunctionExpression: memoize,
            ArrowFunctionExpression: memoize,
          })
        }

        componentFn.process({
          JSXOpeningElement(openingElem) {
            // Inline object props (e.g. the "style" prop) are not
            // memoized for host elements.
            const canAutoMemoize =
              openingElem.name.isJSXIdentifier() &&
              !/^[a-z]/.test(openingElem.name.name)

            // Elements within loops and non-component functions cannot
            // be assigned static keys or have auto-memoized inline
            // callback props.
            const nearestFnOrLoop =
              openingElem.parent.findParent(isFunctionOrLoop)
            if (nearestFnOrLoop !== componentFn) {
              return
            }

            addStaticElementKeys(openingElem)
            if (canAutoMemoize) {
              autoMemoizeProps(openingElem)
            }
          },
          // Auto-memoize any variables declared during render with
          // function expressions as values.
          VariableDeclarator: memoizeVariable,
          AssignmentExpression: memoizeVariable,
        })

        const nearestBlock = path.findParent(p => p.isBlockStatement())
        if (nearestBlock?.parent && componentFns.has(nearestBlock.parent)) {
          helpers.set('registerNestedTag', '__nestedTag')
          const wrappedNode = isSelfUpdating ? path.parent : path
          wrappedNode.before(`__nestedTag("${globalId}#${moduleNextId++}", `)
          wrappedNode.after(')')
          if (wrappedNode.isFunctionDeclaration()) {
            wrappedNode.before(`const ${wrappedNode.id!.name} = `)
          }
        }

        if (ensureComponentNames && !componentFn.isStatement()) {
          const nearestStmt = componentFn.findParent(node => node.isStatement())
          if (nearestStmt) {
            let componentName = getComponentName(path)
            if (!componentName) {
              const nearestVariable = componentFn.findParent(
                node => node.isVariableDeclarator() || node === nearestStmt
              )
              if (
                nearestVariable?.isVariableDeclarator() &&
                nearestVariable.id.isIdentifier()
              ) {
                componentName = nearestVariable.id.name
              }
            }
            if (componentName) {
              nearestStmt.after(
                ` ${componentName}.displayName = "${componentName}";`
              )
            }
          }
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

      // Wrap the children of each thunk parent in a closure.
      jsxThunkParents.forEach((thunk, path) => {
        const nearestFnOrLoop = path.parent.findParent(isFunctionOrLoop)!
        const needsMemo = componentFns.has(nearestFnOrLoop)

        thunk.attributes.forEach(attr => {
          const value = attr.value as Node.JSXExpressionContainer
          const deps = createDeps(value.expression, needsMemo)

          value.expression.before(createElementThunk(needsMemo))
          deps && value.expression.after(deps.code)
        })

        if (thunk.children.size) {
          path.children.forEach((child, i, children) => {
            if (!thunk.children.has(child)) {
              return
            }
            if (child.isJSXExpressionContainer()) {
              const deps = createDeps(child.expression, needsMemo)
              child.expression.before(createElementThunk(!!deps && needsMemo))
              if (deps) {
                child.expression.after(deps.code)
              }
            } else {
              const deps = createDeps(child, needsMemo)
              // HACK: we can't do this the easier way, due to a nebu bug
              const prevChild = children[i - 1]
              if (prevChild && thunk.children.has(prevChild)) {
                prevChild.after(`{` + createElementThunk(!!deps && needsMemo))
              } else {
                child.before(`{` + createElementThunk(!!deps && needsMemo))
              }
              child.after((deps?.code || '') + `}`)
            }
          })
        }
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

function hasRefAttribute(path: Node.JSXOpeningElement) {
  return path.attributes.some(
    attr => attr.isJSXAttribute() && attr.name.name === 'ref'
  )
}
