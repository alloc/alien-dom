import { isDocument } from '../functions/typeChecking'
import { HTMLOrSVGElement } from '../internal/types'
import { useEventTarget } from './useEventTarget'
import { useStableCallback } from './useStableCallback'

export function useClickOutside(handler: () => void) {
  handler = useStableCallback(handler)
  return useEventTarget<HTMLOrSVGElement>(target => {
    if (isDocument(target)) {
      return
    }
    const onClick = (event: Event) => {
      if (!target.contains(event.target as Node)) {
        handler()
      }
    }
    document.addEventListener('click', onClick, {
      capture: true,
      passive: true,
    })
    return () => {
      document.removeEventListener('click', onClick)
    }
  })
}
