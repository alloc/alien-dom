import { JSX } from '../../types'
import { nodeFilter } from './nodeFilter'
import { AlienNodeFilter, AlienSelect, AlienTag } from './types'

export function firstSibling<T extends AlienTag>(
  context: JSX.Element,
  selector: AlienNodeFilter<JSX.Element | Comment | Text>
): AlienSelect<T> | undefined

export function firstSibling<T extends AlienTag>(
  context: Element,
  selector: AlienNodeFilter<Element | Comment | Text>
): AlienSelect<T> | undefined

export function firstSibling<T extends AlienTag>(
  context: Element,
  selector: AlienNodeFilter<any>
): AlienSelect<T> | undefined {
  for (const sibling of siblings(context, selector)) {
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

export function* siblings<T extends AlienTag>(
  context: Element,
  selector?: AlienNodeFilter<any>
): Generator<AlienSelect<T>> {
  if (!context.parentNode) {
    return
  }
  for (const sibling of Array.from(context.parentNode.childNodes)) {
    if (sibling === context) continue
    if (!selector || nodeFilter(sibling, selector)) {
      yield sibling as AlienSelect<T>
    }
  }
}
