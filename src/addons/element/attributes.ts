import { applyProp } from '../../internal/applyProp'
import { DefaultElement } from '../../internal/types'
import { keys } from '../../jsx-dom/util'
import { JSX } from '../../types'

export function patchAttributes<T extends DefaultElement>(
  context: T,
  attributes: JSX.InferAttributes<T>
) {
  for (const name of keys(attributes)) {
    // Note: Refs are unwrapped and not observed.
    applyProp(context, name, attributes[name])
  }
}
