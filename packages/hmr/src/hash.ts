import type { ESTree } from 'meriyah'
import md5Hex from 'md5-hex'

export interface ComponentHash {
  id: ESTree.Identifier
  function:
    | ESTree.FunctionDeclaration
    | ESTree.FunctionExpression
    | ESTree.ArrowFunctionExpression
  hash: string
  selfUpdating: boolean
}

export function computeComponentHashes(ast: ESTree.Program, code: string) {
  const components: ComponentHash[] = []

  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration') {
      if (node.id && /^[A-Z]/.test(node.id.name)) {
        components.push({
          id: node.id,
          function: node,
          hash: md5Hex(code.slice(node.start, node.end)),
          selfUpdating: false,
        })
      }
    } else if (node.type === 'VariableDeclaration') {
      node.declarations.forEach(decl => {
        if (decl.id.type === 'Identifier' && /^[A-Z]/.test(decl.id.name)) {
          const expr = decl.init
          const selfUpdating =
            expr &&
            expr.type === 'CallExpression' &&
            expr.callee.type === 'Identifier' &&
            expr.callee.name === 'selfUpdating'

          if (selfUpdating) {
            const fn = expr.arguments[0]
            if (
              fn.type === 'FunctionExpression' ||
              fn.type === 'ArrowFunctionExpression'
            ) {
              components.push({
                id: decl.id,
                function: fn,
                hash: md5Hex(code.slice(fn.start, fn.end)),
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
