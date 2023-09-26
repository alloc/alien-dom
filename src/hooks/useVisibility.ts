import { ElementRef, isElementRef } from '../functions/createElementRef'
import { ReadonlyRef } from '../observable'
import { useEffect } from './useEffect'
import { useRef } from './useRef'

export type UseVisibilityOptions = {
  root?: Element | ElementRef | Document | null
  rootMargin?: string
  threshold?: number | number[]
}

export function useVisibility(
  target: ElementRef,
  options: UseVisibilityOptions = {}
): ReadonlyRef<boolean> {
  const visibleRef = useRef(false)

  useEffect(() => {
    return target.onceElementExists(target => {
      const init: IntersectionObserverInit = {
        ...options,
        root: isElementRef(options.root)
          ? options.root.toElement()
          : options.root,
      }

      const observer = new IntersectionObserver(entries => {
        visibleRef.value = entries[0].isIntersecting
      }, init)

      observer.observe(target)
      return () => observer.disconnect()
    }).dispose
  }, [target])

  return visibleRef
}
