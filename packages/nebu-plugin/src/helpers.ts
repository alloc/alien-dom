import { Node } from 'nebu'

export function isHostElement(node: Node.JSXElement) {
  const { openingElement } = node
  if (!openingElement.name.isJSXIdentifier()) {
    return false
  }
  const tagName = openingElement.name.name
  return /^[a-z]/.test(tagName)
}

export type FunctionNode =
  | Node.FunctionExpression
  | Node.ArrowFunctionExpression
  | Node.FunctionDeclaration

export function isFunctionNode(path: Node): path is FunctionNode {
  return (
    path.isFunctionExpression() ||
    path.isArrowFunctionExpression() ||
    path.isFunctionDeclaration()
  )
}

export function isBindingPattern(
  path: Node
): path is Node.ObjectPattern | Node.ArrayPattern | Node.Identifier {
  return path.isObjectPattern() || path.isArrayPattern() || path.isIdentifier()
}

export function getComponentName(fn: FunctionNode) {
  for (const id of yieldIdentifiers(fn)) {
    if (/^[A-Z]/.test(id.name)) {
      return id.name
    }
  }
}

function* yieldIdentifiers(fn: FunctionNode) {
  if (fn.isFunctionDeclaration()) {
    if (fn.id) {
      yield fn.id
    }
  } else {
    if (fn.isFunctionExpression() && fn.id) {
      yield fn.id
    }
    if (fn.parent?.isVariableDeclarator() && fn.parent.id.isIdentifier()) {
      yield fn.parent.id
    }
  }
}

export function hasElementProp(path: Node.JSXOpeningElement, name: string) {
  return path.attributes.some(
    attr =>
      attr.isJSXAttribute() &&
      attr.name.isJSXIdentifier() &&
      attr.name.name == name
  )
}

export function findExternalReferences(
  rootNode: Node,
  scopes = new Map<Node, Scope>([[rootNode, createScope(rootNode)]])
) {
  const rootScope = scopes.get(rootNode)!
  if (isFunctionNode(rootNode)) {
    rootNode.params.forEach(param => {
      toIdentifierSet(param).forEach(ident => {
        rootScope.context[ident.name] = ident
      })
    })
  }

  rootNode.process({
    JSXIdentifier(path) {
      if (path.parent.isJSXAttribute() || path.parent.isJSXClosingElement()) {
        return
      }
      if (/^[a-z]/.test(path.name)) {
        return
      }
      const scope = findScope(path, scopes, true)
      scope.references.add(path.name)
    },
    Identifier(path) {
      // Don't track property names as variable references.
      let isPropertyName = false
      if (path.parent.isMemberExpression()) {
        isPropertyName = path.parent.property === path && !path.parent.computed
      } else if (path.parent.isMetaProperty()) {
        isPropertyName = path.parent.property === path
      }
      if (isPropertyName) {
        const scope = findScope(path, scopes)

        // Skip tracking the property access if it's a method call.
        const grandParent = path.parent.parent
        if (
          grandParent.isCallExpression() &&
          grandParent.callee === path.parent
        ) {
          scope.functionCalls.add(path)
          return
        }

        scope.propertyAccess.add(path)
        return
      }

      // Ignore static object keys.
      if (
        path.parent.isProperty() &&
        path.parent.key === path &&
        !path.parent.computed
      ) {
        return
      }

      // Ignore statement labels.
      if (
        path.parent.isBreakStatement() ||
        path.parent.isContinueStatement() ||
        (path.parent.isLabeledStatement() && path.parent.label === path)
      ) {
        return
      }

      // Ignore `import.meta` usage.
      if (path.name === 'import') {
        return
      }

      const declKind = getDeclarationKind(path)
      const scope = findScope(
        path,
        scopes,
        // Hoist "var" and "function" declarations to the
        // nearest function scope (skipping block statements).
        declKind !== 'var' && declKind !== 'function'
      )

      if (declKind !== null) {
        scope.context[path.name] = path
      } else {
        scope.references.add(path.name)

        if (path.parent.isCallExpression() && path.parent.callee === path) {
          scope.functionCalls.add(path)
        }
      }
    },
  })

  // The variables whose initializer contains the `rootNode`
  let rootVariables: string[] = []
  rootNode.findParent(parent => {
    if (parent.isBlockStatement()) {
      return true
    }
    if (parent.isVariableDeclarator() && isBindingPattern(parent.id)) {
      rootVariables = toIdentifierSet(parent.id).map(id => id.name)
      return true
    }
    if (parent.isAssignmentPattern()) {
      rootVariables = toIdentifierSet(parent.left).map(id => id.name)
      return true
    }
    return false
  })

  const externalReferences = new Set<string>()
  for (const scope of scopes.values()) {
    for (const name of scope.references) {
      if (scope.context[name]) {
        continue // Skip references to local bindings.
      }
      if (rootVariables.includes(name)) {
        continue // Skip references to root variables.
      }
      externalReferences.add(name)
    }
  }

  return {
    deps: [...externalReferences],
    hasPropertyAccess: rootScope.propertyAccess.size > 0,
    hasFunctionCall: rootScope.functionCalls.size > 0,
  }
}

export type DeclarationKind = 'var' | 'let' | 'const' | 'param' | 'function'

export function getDeclarationKind(path: Node): DeclarationKind | null {
  if (path.isProgram()) {
    return null
  }
  if (path.parent.isVariableDeclarator()) {
    if (path.parent.id === path) {
      return (path.parent.parent as Node.VariableDeclaration).kind
    }
    return null
  }
  if (path.parent.isCatchClause()) {
    return 'param'
  }
  if (isFunctionNode(path.parent)) {
    if (path.parent.params.includes(path as any)) {
      return 'param'
    }
    if (path.parent.isArrowFunctionExpression()) {
      return null
    }
    if (path.parent.id === path) {
      return 'function'
    }
    return null
  }
  // Before the variable declarator or function parameter is reached,
  // disqualify any identifier found on the right-hand side of an
  // assignment pattern.
  if (path.parent.isAssignmentPattern() && path.parent.left !== path) {
    return null
  }
  if (path.parent.isStatement()) {
    return null
  }
  return getDeclarationKind(path.parent)
}

export type Scope = {
  path: Node
  context: Record<string, Node.Identifier>
  references: Set<string>
  propertyAccess: Set<Node.Identifier>
  functionCalls: Set<Node.Identifier>
}

export function createScope(
  path: Node,
  context: Record<string, Node.Identifier> = {}
): Scope {
  return {
    path,
    context,
    references: new Set(),
    propertyAccess: new Set(),
    functionCalls: new Set(),
  }
}

export function findScope(
  path: Node,
  scopes: Map<Node, Scope>,
  includeBlocks?: boolean
): Scope {
  let scope = scopes.get(path.parent)
  if (scope) {
    return scope
  }
  let stop: boolean | undefined
  if (isFunctionNode(path.parent)) {
    stop = path.parent.isArrowFunctionExpression() || path.parent.id !== path
  } else {
    stop = includeBlocks && path.parent.isBlockStatement()
  }
  if (stop) {
    const parentScope = findScope(path.parent, scopes, true)
    scope = createScope(path.parent, Object.create(parentScope.context))
    scopes.set(path.parent, scope)
    return scope
  }
  return findScope(path.parent, scopes, includeBlocks)
}

export function toIdentifierSet(
  param:
    | Node.Identifier
    | Node.AssignmentPattern
    | Node.ArrayPattern
    | Node.ObjectPattern
    | Node.RestElement
    | Node.Property
): Node.Identifier[] {
  if (param.isIdentifier()) {
    return [param]
  }
  if (param.isAssignmentPattern()) {
    return toIdentifierSet(param.left)
  }
  if (param.isArrayPattern()) {
    return param.elements.flatMap(
      toIdentifierSet as (param: any) => Node.Identifier[]
    )
  }
  if (param.isObjectPattern()) {
    return param.properties.flatMap(
      toIdentifierSet as (param: any) => Node.Identifier[]
    )
  }
  if (param.isRestElement()) {
    return [param.argument as Node.Identifier]
  }
  if (param.isProperty()) {
    return toIdentifierSet(param.value as any)
  }
  return []
}
