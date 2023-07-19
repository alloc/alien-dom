import { applyProp } from '../internal/applyProp'
import { disableEffects } from '../internal/effects'
import { kAlienEffects, kAlienElementProps } from '../internal/symbols'
import { DefaultElement } from '../internal/types'
import { keys } from '../jsx-dom/util'

export function morphAttributes(
  fromNode: DefaultElement,
  toNode: DefaultElement
) {
  const toProps = kAlienElementProps(toNode)
  if (!toProps) {
    return
  }

  const effects = kAlienEffects(fromNode)
  if (effects) {
    disableEffects(effects, true)
  }

  const newProps = new Set(keys(toProps))
  newProps.delete('children')

  const oldProps = kAlienElementProps(fromNode) as Set<string>
  for (const prop of oldProps) {
    if (!newProps.has(prop)) {
      applyProp(fromNode, prop, null)
    }
  }

  kAlienElementProps(fromNode, newProps)
  for (const prop of newProps) {
    applyProp(fromNode, prop, toProps[prop])
  }
}
