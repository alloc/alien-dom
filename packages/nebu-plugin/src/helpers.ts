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

export function getComponentName(fn: FunctionNode) {
  let entity: Node.VariableDeclarator | Node.FunctionDeclaration | undefined

  if (fn.isFunctionDeclaration()) {
    entity = fn
  } else {
    const match = fn.findParent(
      parent => parent.isVariableDeclarator() || parent.isBlockStatement()
    )
    if (!match?.isVariableDeclarator()) {
      return
    }
    entity = match
  }

  const entityName = entity.id?.isIdentifier() && entity.id.name
  if (entityName && /^[A-Z]/.test(entityName)) {
    return entityName
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
  if (isFunctionNode(rootNode)) {
    const rootScope = scopes.get(rootNode)!
    rootNode.params.forEach(param => {
      toIdentifierSet(param).forEach(ident => {
        rootScope.context[ident.name] = ident
      })
    })
  }

  let hasPropertyAccess = false

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
      // Ignore property access.
      if (
        path.parent.isMemberExpression() &&
        path.parent.property === path &&
        !path.parent.computed
      ) {
        hasPropertyAccess = true
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
      }
    },
  })

  const externalReferences = new Set<string>()
  for (const scope of scopes.values()) {
    for (const name of scope.references) {
      if (!scope.context[name]) {
        externalReferences.add(name)
      }
    }
  }

  return {
    deps: [...externalReferences],
    hasPropertyAccess,
  }
}

export type DeclarationKind = 'var' | 'let' | 'const' | 'param' | 'function'

export function getDeclarationKind(path: Node): DeclarationKind | null {
  if (path.parent.isVariableDeclarator()) {
    return (path.parent.parent as Node.VariableDeclaration).kind
  }
  if (isFunctionNode(path.parent)) {
    if (path.parent.params.includes(path as any)) {
      return 'param'
    }
    if (path.parent.isFunctionDeclaration() && path.parent.id === path) {
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
  if (path.parent) {
    return getDeclarationKind(path.parent)
  }
  return null
}

export type Scope = {
  path: Node
  context: Record<string, Node.Identifier>
  references: Set<string>
}

export function createScope(
  path: Node,
  context: Record<string, Node.Identifier> = {}
): Scope {
  return {
    path,
    context,
    references: new Set(),
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
  if (
    isFunctionNode(path.parent) ||
    (includeBlocks && path.parent.isBlockStatement())
  ) {
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
