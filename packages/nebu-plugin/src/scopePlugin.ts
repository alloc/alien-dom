import type { Node, Plugin } from 'nebu'
import { FunctionNode, toIdentifierSet } from './helpers'

type BlockNode =
  | Node.Program
  | Node.BlockStatement
  // These types can have implicit block scopes with declarations inside.
  | Node.ArrowFunctionExpression
  | Node.ForStatement
  | Node.ForOfStatement
  | Node.ForInStatement

type BlockScope = {
  block: BlockNode
  parent: BlockScope | null
  declarations: Map<string, Declaration>
}

type ParamDeclaration = {
  kind: 'param'
  node: Node.Identifier
  scope: BlockScope
}

type VariableDeclaration = {
  kind: 'var'
  node: Node.Identifier
  init: Node.Expression | null
  scope: BlockScope
}

type ImportDeclaration = {
  kind: 'import'
  node: Node.Identifier
  scope: BlockScope
}

type FunctionDeclaration = {
  kind: 'function'
  node: Node.FunctionDeclaration | Node.FunctionExpression
  scope: BlockScope
}

type Declaration =
  | ParamDeclaration
  | VariableDeclaration
  | ImportDeclaration
  | FunctionDeclaration

export type ScopeTracker = ReturnType<typeof createScopeTracker>

export function createScopeTracker() {
  const scopes = new Map<BlockNode, BlockScope>()

  const findDeclaration = (scope: BlockScope | null, name: string) => {
    while (scope) {
      const declaration = scope.declarations.get(name)
      if (declaration) {
        return declaration
      }
      scope = scope.parent
    }
    return null
  }

  const getDeclarationScope = (
    node: Node,
    forcedScope?: 'block' | 'function'
  ): BlockScope => {
    let block: BlockNode

    if (node.isProgram()) {
      block = node
    } else if (node.isBlockStatement()) {
      block = node

      if (forcedScope === 'function' && !isFunctionNode(block.parent)) {
        return getDeclarationScope(block.parent, 'function')
      }
    } else if (
      node.parent.isArrowFunctionExpression() &&
      node === node.parent.body
    ) {
      // Implicit block scope for one-line arrow function.
      block = node.parent
    } else if (
      forcedScope !== 'function' &&
      (node.parent.isForStatement() ||
        node.parent.isForOfStatement() ||
        node.parent.isForInStatement()) &&
      node === node.parent.body
    ) {
      // Implicit block scope for one-line for loops.
      block = node.parent
    } else {
      // Function declarations and `var` statements are function-scoped.
      forcedScope ??=
        node.isFunctionDeclaration() ||
        (node.isVariableDeclaration() && node.kind === 'var')
          ? 'function'
          : 'block'

      return getDeclarationScope(node.parent, forcedScope)
    }

    let scope = scopes.get(block)
    if (!scope) {
      scope = { block, parent: null, declarations: new Map() }
      scopes.set(block, scope)

      if (!block.isProgram()) {
        scope.parent = getDeclarationScope(block.parent, 'block')
      }
    }

    return scope
  }

  const registerDeclaration = (
    node:
      | Node.CatchClause
      | Node.VariableDeclarator
      | Node.ImportDeclaration
      | Node.FunctionDeclaration
      | Node.FunctionExpression
  ) => {
    // A named function expression is declared within its own function body,
    // but that's all.
    if (node.isFunctionExpression()) {
      if (!node.id) {
        return
      }
      const scope = getDeclarationScope(node.body!)
      return scope.declarations.set(node.id.name, {
        kind: 'function',
        node: node,
        scope,
      })
    }

    // A catch parameter is declared within the catch clause.
    if (node.isCatchClause()) {
      if (!node.param) {
        return
      }
      const scope = getDeclarationScope(node.body)
      return toIdentifierSet(node.param).forEach(id => {
        scope.declarations.set(id.name, {
          kind: 'param',
          node: id,
          scope,
        })
      })
    }

    if (node.isVariableDeclarator()) {
      const declaration = node.parent as Node.VariableDeclaration
      const context = declaration.parent

      const scope = getDeclarationScope(
        declaration.kind !== 'var' &&
          (context.isForStatement() ||
            context.isForOfStatement() ||
            context.isForInStatement())
          ? context.body
          : declaration
      )

      const lhs = node.id as
        | Node.Identifier
        | Node.ArrayPattern
        | Node.ObjectPattern

      return toIdentifierSet(lhs).forEach(id => {
        scope.declarations.set(id.name, {
          kind: 'var',
          node: id,
          init: id.parent.isVariableDeclarator() ? id.parent.init : null,
          scope,
        })
      })
    }

    const scope = getDeclarationScope(node)

    if (node.isImportDeclaration()) {
      for (const specifier of node.specifiers) {
        scope.declarations.set(specifier.local.name, {
          kind: 'import',
          node: specifier.local,
          scope,
        })
      }
    } else if (node.isFunctionDeclaration()) {
      scope.declarations.set(node.id!.name, {
        kind: 'function',
        node: node,
        scope,
      })
    }
  }

  const registerFunctionAndParameters = (node: FunctionNode) => {
    if (node.isFunctionDeclaration()) {
      registerDeclaration(node)
    } else if (node.isFunctionExpression() && node.id) {
      registerDeclaration(node)
    }

    const scope = getDeclarationScope(node.body!)
    node.params.flatMap(toIdentifierSet).forEach(id => {
      scope.declarations.set(id.name, {
        kind: 'param',
        node: id,
        scope,
      })
    })
  }

  return {
    findDeclaration,
    getDeclarationScope,
    registerDeclaration,
    registerFunctionAndParameters,
  }
}

export function createScopePlugin(scopes: ScopeTracker): Plugin {
  const { registerDeclaration, registerFunctionAndParameters } = scopes

  return {
    CatchClause: registerDeclaration,
    ImportDeclaration: registerDeclaration,
    VariableDeclarator: registerDeclaration,
    ArrowFunctionExpression: registerFunctionAndParameters,
    FunctionExpression: registerFunctionAndParameters,
    FunctionDeclaration: registerFunctionAndParameters,
  }
}
