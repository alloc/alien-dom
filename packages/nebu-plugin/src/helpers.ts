import { Node } from 'nebu'
import { ESTree } from 'nebu/dist/types'

export function isHostElement(node: Node<ESTree.JSXElement>) {
  const { openingElement } = node
  if (!openingElement.name.isJSXIdentifier()) {
    return false
  }
  const tagName = openingElement.name.name
  return /^[a-z]/.test(tagName)
}

export type FunctionNode = Node<
  | ESTree.FunctionExpression
  | ESTree.ArrowFunctionExpression
  | ESTree.FunctionDeclaration
>

export function isFunctionNode(path: Node): path is FunctionNode {
  return (
    path.isFunctionExpression() ||
    path.isArrowFunctionExpression() ||
    path.isFunctionDeclaration()
  )
}

export function getComponentName(fn: FunctionNode) {
  let entity:
    | Node<ESTree.VariableDeclarator | ESTree.FunctionDeclaration>
    | undefined

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

export function hasElementProp(
  path: Node<ESTree.JSXOpeningElement>,
  name: string
) {
  return path.attributes.some(
    attr =>
      attr.isJSXAttribute() &&
      attr.name.isJSXIdentifier() &&
      attr.name.name == name
  )
}
