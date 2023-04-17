export interface ComponentHash<Identifier, FunctionNode> {
  id: Identifier
  function: FunctionNode
  hash: string
  selfUpdating: boolean
}

export function computeComponentHashes<Identifier, FunctionNode>(
  ast: Program,
  code: string,
  hash: (code: string) => string
) {
  const components: ComponentHash<Identifier, FunctionNode>[] = []

  for (const node of ast.body) {
    if (hasNodeType(node, 'FunctionDeclaration')) {
      if (node.id && /^[A-Z]/.test(node.id.name)) {
        components.push({
          id: node.id as Identifier,
          function: node as FunctionNode,
          hash: hash(code.slice(node.start, node.end)),
          selfUpdating: false,
        })
      }
    } else if (hasNodeType(node, 'VariableDeclaration')) {
      node.declarations.forEach(decl => {
        if (hasNodeType(decl.id, 'Identifier') && /^[A-Z]/.test(decl.id.name)) {
          const expr = decl.init
          const selfUpdating =
            expr &&
            hasNodeType(expr, 'CallExpression') &&
            hasNodeType(expr.callee, 'Identifier') &&
            expr.callee.name === 'selfUpdating'

          if (selfUpdating) {
            const fn = expr.arguments[0]
            if (
              fn.type === 'FunctionExpression' ||
              fn.type === 'ArrowFunctionExpression'
            ) {
              components.push({
                id: decl.id as Identifier,
                function: fn as FunctionNode,
                hash: hash(code.slice(fn.start, fn.end)),
                selfUpdating: true,
              })
            }
          }
        }
      })
    }
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
