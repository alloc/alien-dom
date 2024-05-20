import { applyProp } from '../../internal/applyProp'
import { HTMLOrSVGElement } from '../../internal/types'
import { keys } from '../../internal/util'
import { JSX } from '../../types'

export function patchAttributes<T extends HTMLOrSVGElement>(
  context: T,
  attributes: JSX.InferAttributes<T>
) {
  for (const name of keys(attributes)) {
    // Note: Refs are unwrapped and not observed.
    applyProp(context, name, attributes[name])
  }
}
