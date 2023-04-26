import { batch } from '@preact/signals-core'
import { AnyElement } from './types'
import { defineEffectType, getCurrentEffect } from '../effects'

export const elementEvent = defineEffectType(
  <Element extends AnyElement, EventName extends string>(
    element: Element,
    eventName: EventName,
    callback: (event: any) => void,
    options?: boolean | AddEventListenerOptions
  ) => {
    const self = getCurrentEffect()
    if (self) {
      const isOnce = options && typeof options != 'boolean' && options.once
      const userCallback = callback
      callback = event => {
        if (isOnce) {
          self.context?.remove(self)
        }
        batch(userCallback.bind(null, event))
      }
    }
    element.addEventListener(eventName, callback, options)
    return () => {
      element.removeEventListener(eventName, callback, options)
    }
  }
)
