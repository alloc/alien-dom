import { kAlienNodeType, kTemplateNodeType } from '../internal/constants'
import type { DefaultElement } from '../internal/types'
import type { TemplateNode } from '../jsx-dom/node'
import type { FunctionComponent, HTMLTagName, JSX, SVGTagName } from '../types'

/**
 * Declare a template node, which can be used as a JSX element type. The JSX
 * runtime will use `cloneNode(true)` on the template.
 */
export function template<T extends HTMLTagName | SVGTagName>(
  template: DefaultElement
): FunctionComponent<JSX.InferProps<T>> {
  const node: TemplateNode = { [kAlienNodeType]: kTemplateNodeType, template }
  return node as any
}
