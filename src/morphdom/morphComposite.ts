import { getElementTags } from '../internal/symbols'
import { DeferredCompositeNode, evaluateDeferredNode } from '../jsx-dom/node'

export function morphComposite<T extends Node>(
  fromParentNode: T,
  toParentNode: DeferredCompositeNode
) {
  const tags = getElementTags(fromParentNode)
  const childComponent = tags?.get(toParentNode.tag)

  if (childComponent) {
    childComponent.replaceProps(toParentNode.props)
    toParentNode.context?.forEach((ref, key) => {
      const targetRef = childComponent.context.get(key)
      if (targetRef) {
        targetRef.value = ref.peek()
      }
    })
    return fromParentNode
  }

  return evaluateDeferredNode(toParentNode)
}
