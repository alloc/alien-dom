import { AnyElement } from './internal/types'
import { createHookType, getCurrentHook } from './hooks'

export const elementEvent = createHookType(
  <Element extends AnyElement, EventName extends string>(
    element: Element,
    eventName: EventName,
    callback: (event: any) => void,
    options?: boolean | AddEventListenerOptions
  ) => {
    const self = getCurrentHook()
    if (self && options && typeof options != 'boolean' && options.once) {
      const userCallback = callback
      callback = event => {
        self?.context?.remove(self)
        userCallback(event)
      }
    }
    element.addEventListener(eventName, callback, options)
    return () => {
      element.removeEventListener(eventName, callback, options)
    }
  }
)
