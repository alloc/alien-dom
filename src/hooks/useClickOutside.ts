import { isDocument } from '../functions/typeChecking'
import { DefaultElement } from '../internal/types'
import { useCallbackProp } from './useCallbackProp'
import { useEventTarget } from './useEventTarget'

export function useClickOutside(handler: () => void) {
  handler = useCallbackProp(handler)
  return useEventTarget<DefaultElement>(target => {
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
