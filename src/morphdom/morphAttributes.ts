import { applyProp } from '../internal/applyProp'
import { disableEffects } from '../internal/effects'
import { kAlienEffects, kAlienElementProps } from '../internal/symbols'
import { DefaultElement } from '../internal/types'
import { DeferredNode } from '../jsx-dom/node'
import { keys } from '../jsx-dom/util'

export function morphAttributes(
  fromNode: DefaultElement,
  toNode: DeferredNode
) {
  const effects = kAlienEffects(fromNode)
  if (effects) {
    disableEffects(effects, true)
  }

  const newProps = new Set(keys(toNode.props))
  newProps.delete('children')

  const oldProps = kAlienElementProps(fromNode)!
  for (const prop of oldProps) {
    if (!newProps.has(prop)) {
      applyProp(fromNode, prop, null)
    }
  }

  kAlienElementProps(fromNode, newProps)
  for (const prop of newProps) {
    applyProp(fromNode, prop, toNode.props[prop])
  }
}
