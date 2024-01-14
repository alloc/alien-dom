import { kAlienElementTags } from '../internal/symbols'
import { DefaultElement } from '../internal/types'
import { DeferredCompositeNode } from '../jsx-dom/node'

export function morphComposite(
  fromParentNode: DefaultElement | DocumentFragment,
  toParentNode: DeferredCompositeNode
) {
  const tags = kAlienElementTags(fromParentNode)!
  const childComponent = tags.get(toParentNode.tag)!

  childComponent.updateProps(toParentNode.props)
  toParentNode.context?.forEach((ref, key) => {
    const targetRef = childComponent.context.get(key)
    if (targetRef) {
      targetRef.value = ref.peek()
    }
  })
}
