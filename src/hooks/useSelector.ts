import {
  observeNewDescendants,
  observeRemovedDescendants,
} from '../addons/domObserver'
import { isElement } from '../functions/typeChecking'
import { AnyElement } from '../internal/types'
import { ReadonlyRef, Ref } from '../observable'
import { useEffect } from './useEffect'
import { useRef } from './useRef'

function observeDescendants<Element extends AnyElement>(
  context: Node,
  selector: string,
  onMatch: (element: Element, isConnected: boolean) => void
) {
  const onAdded = observeNewDescendants(context, node => {
    if (isElement(node) && node.matches(selector)) {
      onMatch(node as any, true)
    }
  })
  const onRemoved = observeRemovedDescendants(context, node => {
    if (isElement(node) && node.matches(selector)) {
      onMatch(node as any, false)
    }
  })
  return () => {
    onAdded.dispose()
    onRemoved.dispose()
  }
}

export function useQuerySelector<Element extends AnyElement>(
  selector: string,
  context: AnyElement = document.body
): ReadonlyRef<Element | null> & Iterable<Element | null> {
  const match = useRef<Element | null>(null)
  useEffect(() => {
    match.value = context.querySelector(selector)
    return observeDescendants<Element>(context, selector, () => {
      match.value = context.querySelector(selector)
    })
  }, [context, selector])

  return match as any
}

export function useQuerySelectorAll<Element extends AnyElement>(
  selector: string,
  context: HTMLElement = document.body
): ReadonlyRef<Set<Element>> & Iterable<Set<Element>> {
  const matches = useRef<Set<Element>>() as Ref<Set<Element>>
  matches.value ||= new Set()

  useEffect(() => {
    context.querySelectorAll<Element>(selector).forEach(element => {
      matches.value.add(element)
    })
    return observeDescendants<Element>(
      context,
      selector,
      (element, isConnected) => {
        matches.value = new Set(matches.value)
        if (isConnected) {
          matches.value.add(element)
        } else {
          matches.value.delete(element)
        }
      }
    )
  }, [context, selector])

  return matches as any
}
