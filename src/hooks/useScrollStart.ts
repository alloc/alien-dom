import { isDocument } from '../functions/typeChecking'
import { useEventTarget } from './useEventTarget'
import { useStableCallback } from './useStableCallback'

export function useScrollStart(handler: (event: Event) => void) {
  handler = useStableCallback(handler)
  return useEventTarget<HTMLElement>(target => {
    if (isDocument(target)) {
      target = target.scrollingElement as HTMLElement
    } else {
      target = findScrollingElement(target)
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

function findScrollingElement(elem: HTMLElement) {
  const root = document.scrollingElement as HTMLElement
  while (elem && elem !== root) {
    const style = getComputedStyle(elem)
    const overflow = style.overflow + style.overflowY + style.overflowX
    if (overflow.includes('scroll')) {
      return elem
    }
    elem = elem.parentElement!
  }
  return root
}
