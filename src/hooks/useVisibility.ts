import { ElementProxy, isElementProxy } from '../addons/elementProxy'
import { ReadonlyRef } from '../core/observable'
import { isElement } from '../functions/typeChecking'
import { HTMLOrSVGElement } from '../internal/types'
import { useEffect } from './useEffect'
import { useRef } from './useRef'

export type UseVisibilityOptions = {
  root?: Element | ElementProxy | Document | null
  rootMargin?: string
  threshold?: number | number[]
}

export function useVisibility(
  target: HTMLOrSVGElement | ElementProxy,
  options: UseVisibilityOptions = {}
): ReadonlyRef<boolean> {
  const visibleRef = useRef(false)

  useEffect(() => {
    function observe(target: Element) {
      const init: IntersectionObserverInit = {
        ...options,
        root: isElementProxy(options.root)
          ? options.root.toElement()
          : options.root,
      }

      const observer = new IntersectionObserver(entries => {
        visibleRef.value = entries[0].isIntersecting
      }, init)

      observer.observe(target)
      return () => observer.disconnect()
    }

    return isElement(target)
      ? observe(target)
      : target.onceElementExists(observe).dispose
  }, [target])

  return visibleRef
}
