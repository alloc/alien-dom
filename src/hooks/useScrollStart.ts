import { isDocument } from '../functions/typeChecking'
import { useCallbackProp } from './useCallbackProp'
import { useEventTarget } from './useEventTarget'

export function useScrollStart(handler: (event: Event) => void) {
  handler = useCallbackProp(handler)
  return useEventTarget<HTMLElement>(target => {
    if (isDocument(target)) {
      target = target.scrollingElement as HTMLElement
    }
    let started = false
    let stopTimer = -1
    const onScroll = (event: Event) => {
      if (started) {
        clearTimeout(stopTimer)
        stopTimer = setTimeout(() => {
          started = false
        }, 100)
      } else {
        started = true
        handler(event)
      }
    }
    target.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      target.removeEventListener('scroll', onScroll)
    }
  })
}
