import type { AlienElementList, AlienSelect, AlienTag } from './element'
import { canMatch, isIterable } from './internal/duck'
import { AnyElement, DefaultElement } from './internal/types'

export interface AlienNodeList<Element extends Node>
  extends ReturnType<typeof defineAlienNodeList<Element>> {}

export const AlienNodeListPrototype = defineAlienNodeList<Element>()

const AlienElementListPrototype = {
  ...AlienNodeListPrototype,
  __proto__: Array.prototype,
  // Exists for compatibility with NodeList.
  item(this: Element[], index: number): Element | null {
    return this[index] || null
  },
}

export function createAlienElementList<
  Element extends AlienTag<DefaultElement> = DefaultElement
>(
  arg?:
    | AnyElement
    | NodeListOf<AnyElement>
    | Iterable<AnyElement>
    | false
    | null
): AlienElementList<AlienSelect<Element>> {
  if (arg && arg instanceof NodeList) {
    return arg as any
  }
  const list = !arg ? [] : isIterable(arg) ? [...arg] : [arg]
  Object.setPrototypeOf(list, AlienElementListPrototype)
  return list as any
}

function defineAlienNodeList<T extends Node>() {
  return {
    [Symbol.iterator](this: NodeListOf<T>): IterableIterator<T> {
      const out: T[] = []
      this.forEach((value, index) => {
        out[index] = value
      })
      return out[Symbol.iterator]()
    },
    map<U>(this: NodeListOf<T>, iterator: (value: T, index: number) => U): U[] {
      const out: U[] = []
      this.forEach((value, index) => {
        out.push(iterator(value, index))
      })
      return out
    },
    filter<U extends T = T>(
      this: NodeListOf<T>,
      selector: string | ((value: T, index: number) => any)
    ): U[] {
      const out: U[] = []
      const filter =
        typeof selector == 'string'
          ? (value: T) => canMatch(value) && value.matches(selector)
          : selector
      this.forEach((value, index) => {
        if (filter(value, index)) {
          out.push(value as U)
        }
      })
      return out
    },
    mapFilter<U>(
      this: NodeListOf<T>,
      iterator: (value: T, index: number) => U | null | undefined | void
    ): U[] {
      const out: U[] = []
      this.forEach((value, index) => {
        const result = iterator(value, index)
        if (result != null) {
          out.push(result as U)
        }
      })
      return out
    },
    find<U extends T = T>(
      this: NodeListOf<T>,
      selector: string | ((value: T, index: number) => any)
    ): U | undefined {
      const filter =
        typeof selector == 'string'
          ? (value: T) => canMatch(value) && value.matches(selector)
          : selector
      for (let i = 0; i < this.length; i++) {
        if (filter(this[i], i)) {
          return this[i] as U
        }
      }
    },
  }
}
