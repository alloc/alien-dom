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
  rootFn: FunctionNode,
  scopes = new Map<ScopeNode, Scope>([[rootFn, createScope(rootFn)]])
) {
  const rootScope = scopes.get(rootFn)!
  rootFn.params.forEach(param => {})

  rootFn.process({
    Identifier(path) {
      // Ignore property access.
      if (
        path.parent.isMemberExpression() &&
        path.parent.property === path &&
        !path.parent.computed
      ) {
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

  return [...externalReferences]
}

export function getDeclarationKind(path: Node.Identifier) {
  if (path.parent.isVariableDeclarator()) {
    return (path.parent.parent as Node.VariableDeclaration).kind
  }
  if (isFunctionNode(path.parent) && path.parent.params.includes(path)) {
    return 'param'
  }
  if (path.parent.isAssignmentPattern() && path.parent.left === path) {
    return 'param'
  }
  if (path.parent.isFunctionDeclaration() && path.parent.id === path) {
    return 'function'
  }
  return null
}

export type ScopeNode = Node.BlockStatement | FunctionNode

export type Scope = {
  path: ScopeNode
  context: Record<string, Node.Identifier>
  references: Set<string>
}

export function createScope(
  path: ScopeNode,
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
  if (
    isFunctionNode(path.parent) ||
    (includeBlocks && path.parent.isBlockStatement())
  ) {
    let scope = scopes.get(path.parent)
    if (!scope) {
      const parentScope = findScope(path.parent, scopes, true)
      scope = createScope(path.parent, Object.create(parentScope.context))
      scopes.set(path.parent, scope)
    }
    return scope
  }
  return findScope(path.parent, scopes, includeBlocks)
}
