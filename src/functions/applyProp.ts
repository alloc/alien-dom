import {
  ApplyFunctionMap,
  addHostProp,
  generateApplyFunction,
} from '../internal/applyProp'
import { HostProps } from '../internal/hostProps'
import { AnyElement, HTMLOrSVGElement } from '../internal/types'
import { noop } from '../jsx-dom/util'
import { DetailedHTMLProps, HTMLAttributes, SVGAttributes } from '../types'

type Attributes<Element extends AnyElement> = (Element extends HTMLElement
  ? DetailedHTMLProps<HTMLAttributes<Element>, Element>
  : unknown) &
  (Element extends SVGElement
    ? DetailedHTMLProps<SVGAttributes<Element>, Element>
    : unknown)

export function applyProp<Node extends HTMLOrSVGElement>(
  node: Node,
  prop: HTMLAttributes,
  value: any,
  hostProps?: HostProps
): void {
  const attr = prop === 'htmlFor' ? 'for' : prop
  const apply = (ApplyFunctionMap[attr] ||= generateApplyFunction(attr))
  if (apply !== noop) {
    if (prop !== 'children') {
      value = addHostProp(hostProps, prop, value)
    }
    apply(node, value, hostProps)
  }
}
