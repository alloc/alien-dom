import type { Node as NebuNode } from 'nebu'
import { isFunctionNode } from './helpers'

export interface ComponentHash<Identifier, FunctionNode> {
  id: Identifier
  function: FunctionNode
  hash: string
}

export function computeComponentHashes<Identifier, FunctionNode>(
  ast: NebuNode.Program,
  code: string,
  hash: (code: string) => string
) {
  const components: ComponentHash<Identifier, FunctionNode>[] = []

  const skipped = new Set<NebuNode>()
  const skip = (node: NebuNode) => {
    if (!node.removed) {
      // Trick nebu into not walking this subtree. This will be undone before we
      // return, so future `process` calls will still walk this subtree.
      node.removed = true
      skipped.add(node)
    }
  }

  function processNamedFunction(
    node: NebuNode.FunctionDeclaration | NebuNode.FunctionExpression
  ) {
    if (node.id && /^[A-Z]/.test(node.id.name)) {
      const nearestScope = node.findParent(
        node => node.isProgram() || isFunctionNode(node)
      )!

      if (nearestScope.isProgram()) {
        components.push({
          id: node.id as Identifier,
          function: node as FunctionNode,
          hash: hash(code.slice(node.start, node.end)),
        })
      }
    }

    skip(node)
  }

  ast.process({
    FunctionDeclaration: processNamedFunction,
    FunctionExpression: processNamedFunction,
    VariableDeclaration(node) {
      for (const decl of node.declarations) {
        if (
          hasNodeType(decl.id, 'Identifier') &&
          /^[A-Z]/.test(decl.id.name) &&
          decl.init
        ) {
          const id = decl.id
          const processFunctionExpression = (
            node: NebuNode.FunctionExpression | NebuNode.ArrowFunctionExpression
          ) => {
            const nearestScope = node.findParent(
              node => node.isProgram() || isFunctionNode(node)
            )!

            if (nearestScope.isProgram()) {
              components.push({
                id: id as Identifier,
                function: node as FunctionNode,
                hash: hash(code.slice(node.start, node.end)),
              })
            }

            skip(node)
          }

          decl.init.process({
            FunctionExpression: processFunctionExpression,
            ArrowFunctionExpression: processFunctionExpression,
          })
        }
      }
    },
  })

  for (const node of skipped) {
    node.removed = false
  }

  return components
}

function hasNodeType<Type extends keyof Node>(
  node: AnyNode,
  type: Type
): node is Node[Type] {
  return node.type === type
}

interface Program {
  body: readonly (FunctionDeclaration | VariableDeclaration | AnyNode)[]
}
interface AnyNode {
  type: string & {}
  start: number
  end: number
}
interface Node {
  Identifier: Identifier
  FunctionDeclaration: FunctionDeclaration
  VariableDeclaration: VariableDeclaration
  VariableDeclarator: VariableDeclarator
  CallExpression: CallExpression
  FunctionExpression: FunctionExpression
  ArrowFunctionExpression: ArrowFunctionExpression
}
interface Identifier extends AnyNode {
  type: 'Identifier'
  name: string
}
interface FunctionDeclaration extends AnyNode {
  type: 'FunctionDeclaration'
  id: Identifier
}
interface VariableDeclaration extends AnyNode {
  type: 'VariableDeclaration'
  declarations: VariableDeclarator[]
}
interface VariableDeclarator extends AnyNode {
  type: 'VariableDeclarator'
  id: Identifier | AnyNode
  init: AnyNode | CallExpression | null
}
interface CallExpression extends AnyNode {
  type: 'CallExpression'
  callee: Identifier | AnyNode
  arguments: (FunctionExpression | ArrowFunctionExpression | AnyNode)[]
}
interface FunctionExpression extends AnyNode {
  type: 'FunctionExpression'
}
interface ArrowFunctionExpression extends AnyNode {
  type: 'ArrowFunctionExpression'
}
