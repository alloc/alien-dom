import { isNumber, isString } from '@alloc/is'
import { HTMLOrSVGElement } from '../../internal/types'
import { JSX } from '../../types'
import { nodeFilter } from './nodeFilter'
import { AlienNodeFilter, AlienSelect, AlienTag } from './types'

const alwaysFalse = () => false

export enum SiblingPosition {
  /** Start from the first sibling. Visit all siblings. */
  any,
  /** Start from the last sibling. Visit all siblings. */
  anyReverse,
  /** Start from the first sibling before the context. Stop at context. */
  before,
  /** Start from the last sibling before the context. Stop at context. */
  beforeReverse,
  /** Start from the first sibling after the context. Stop at context.  */
  after,
  /** Start from the last sibling after the context. Stop at context. */
  afterReverse,
}

export type SiblingPositionKey = keyof typeof SiblingPosition

export function firstSibling<T extends AlienTag = HTMLOrSVGElement>(
  context: JSX.Element,
  selector: AlienNodeFilter<JSX.Element | Comment | Text>
): AlienSelect<T> | undefined

export function firstSibling<T extends AlienTag = HTMLOrSVGElement>(
  context: Element,
  selector: AlienNodeFilter<Element | Comment | Text>
): AlienSelect<T> | undefined

export function firstSibling<T extends AlienTag = HTMLOrSVGElement>(
  context: JSX.Element,
  position: SiblingPosition | SiblingPositionKey,
  selector: AlienNodeFilter<JSX.Element | Comment | Text>
): AlienSelect<T> | undefined

export function firstSibling<T extends AlienTag = HTMLOrSVGElement>(
  context: Element,
  position: SiblingPosition | SiblingPositionKey,
  selector: AlienNodeFilter<Element | Comment | Text>
): AlienSelect<T> | undefined

export function firstSibling<T extends AlienTag>(
  context: Element,
  position: SiblingPosition | SiblingPositionKey | AlienNodeFilter<any>,
  selector?: AlienNodeFilter<any>
): AlienSelect<T> | undefined {
  for (const sibling of siblings(context, position, selector)) {
    return sibling as AlienSelect<T>
  }
}

export function siblings<T extends AlienTag>(
  context: JSX.Element,
  selector?: AlienNodeFilter<JSX.Element | Comment | Text>
): Generator<AlienSelect<T>>

export function siblings<T extends AlienTag>(
  context: Element,
  selector?: AlienNodeFilter<Element | Comment | Text>
): Generator<AlienSelect<T>>

export function siblings<T extends AlienTag>(
  context: JSX.Element,
  position: SiblingPosition | SiblingPositionKey,
  selector?: AlienNodeFilter<JSX.Element | Comment | Text>
): Generator<AlienSelect<T>>

export function siblings<T extends AlienTag>(
  context: Element,
  position: SiblingPosition | SiblingPositionKey,
  selector?: AlienNodeFilter<Element | Comment | Text>
): Generator<AlienSelect<T>>

export function siblings<T extends AlienTag>(
  context: JSX.Element,
  position:
    | SiblingPosition
    | SiblingPositionKey
    | AlienNodeFilter<JSX.Element | Comment | Text>,
  selector?: AlienNodeFilter<JSX.Element | Comment | Text>
): Generator<AlienSelect<T>>

export function siblings<T extends AlienTag>(
  context: Element,
  position?:
    | SiblingPosition
    | SiblingPositionKey
    | AlienNodeFilter<Element | Comment | Text>,
  selector?: AlienNodeFilter<Element | Comment | Text>
): Generator<AlienSelect<T>>

export function* siblings<T extends AlienTag>(
  context: Element,
  position?: SiblingPosition | SiblingPositionKey | AlienNodeFilter<any>,
  selector?: AlienNodeFilter<any>
): Generator<AlienSelect<T>> {
  if (!context.parentNode) {
    return
  }
  if (isString(position) && position in SiblingPosition) {
    position = SiblingPosition[position as SiblingPositionKey]
  } else if (!isNumber(position)) {
    selector = position
    position = SiblingPosition.any
  }

  const siblings = Array.from(context.parentNode.childNodes)

  let stopAtContext = true
  let startIndex = 0
  let direction = 1
  let endIndex = siblings.length

  if (position < 2) {
    stopAtContext = false
  } else if (position < 4) {
    endIndex = siblings.indexOf(context)
  } else {
    startIndex = siblings.indexOf(context) + 1
  }

  if (position % 2) {
    ;[startIndex, endIndex] = [endIndex, startIndex]
    direction = -1
  }

  for (let i = startIndex; i !== endIndex; i += direction) {
    const sibling = siblings[i]
    if (sibling === context) {
      if (stopAtContext) {
        break
      }
      continue
    }
    if (!selector || nodeFilter(sibling, selector)) {
      yield sibling as AlienSelect<T>
    }
  }
}
