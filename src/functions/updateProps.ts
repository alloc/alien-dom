import { AlienComponent } from '../internal/component'
import { kAlienElementTags } from '../internal/symbols'
import { AnyElement } from '../internal/types'
import { FunctionComponent } from '../types'

export function updateProps(
  node: AnyElement,
  props: object,
  tag?: FunctionComponent
) {
  const tags = kAlienElementTags(node)
  if (!tags) {
    throw Error('updateProps only works with component nodes')
  }

  const component: AlienComponent = tag
    ? tags.get(tag)
    : tags.values().next().value

  component?.updateProps(props)
}
