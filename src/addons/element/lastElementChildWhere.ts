import { AnyElement, DefaultElement } from '../../internal/types'

export function lastElementChildWhere<T extends SVGElement = SVGElement>(
  parentNode: SVGElement,
  filter: (child: T) => boolean
): T | null

export function lastElementChildWhere<T extends AnyElement = DefaultElement>(
  parentNode: AnyElement,
  filter: (child: T) => boolean
): T | null

export function lastElementChildWhere(
  parentNode: AnyElement,
  filter: (child: any) => boolean
): AnyElement | null {
  for (
    let child = parentNode.lastElementChild;
    child;
    child = child.previousElementSibling
  ) {
    if (filter(child)) {
      return child
    }
  }
  return null
}
