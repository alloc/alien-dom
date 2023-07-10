import { isArray, isBoolean, isObject } from '@alloc/is'
import { Disposable } from '../disposable'
import { DefaultElement } from '../internal/types'
import { enablePropObserver } from '../jsx-dom/jsx-runtime'
import { keys } from '../jsx-dom/util'
import { Ref, isRef } from '../observable'
import { DOMClassAttribute } from '../types'

export function classToString(
  value: DOMClassAttribute | Ref<DOMClassAttribute>,
  node?: DefaultElement,
  refs = new Set<Ref>(),
  observers = new Map<Ref, Disposable>(),
  rootValue?: DOMClassAttribute
): string {
  let result: string | undefined

  if (value != null && !isBoolean(value)) {
    if (isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const names = classToString(
          value[i],
          node,
          refs,
          observers,
          rootValue ?? value
        )
        if (names) {
          result = (result ? result + ' ' : '') + names
        }
      }
    } else if (isRef(value)) {
      result = classToString(value.peek(), node, refs, observers, rootValue)
      if (node) {
        enableClassObserver(value, node, refs, observers, rootValue)
      }
    } else if (isObject(value) && value.constructor !== DOMTokenList) {
      for (const name of keys(value)) {
        let enabled = (value as any)[name] as boolean | Ref<boolean>
        if (isRef(enabled)) {
          if (node) {
            enableClassObserver(enabled, node, refs, observers, rootValue)
          }
          enabled = enabled.peek()
        }
        if (enabled) {
          result = (result ? result + ' ' : '') + name
        }
      }
    } else {
      result = String(value)
    }
  }

  return result ?? ''
}

function enableClassObserver(
  ref: Ref,
  node: DefaultElement,
  refs: Set<Ref>,
  observers: Map<Ref, Disposable>,
  rootValue: DOMClassAttribute
) {
  refs.add(ref)
  if (!observers.has(ref)) {
    observers.set(
      ref,
      enablePropObserver(node, 'class', ref, node => {
        const refs = new Set<Ref>()
        node.setAttribute(
          'class',
          classToString(rootValue, node, refs, observers)
        )
        // Dispose observers of nested refs that are no longer used.
        observers.forEach(
          (observer, ref) => refs.has(ref) || observer.dispose()
        )
      })
    )
  }
}
