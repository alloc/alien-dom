import { isFunction } from '@alloc/is'
import { defineEffectType, getCurrentEffect } from '../core/effects'

type EventHandler<Event> =
  | ((event: Event) => void)
  | { handleEvent(event: Event): void }

/**
 * Create an effect that adds an event listener to the target. The
 * effect is added to the current effect context, just like any
 * `createEffect` call would be.
 */
export const createEventEffect = defineEffectType(
  <Target extends EventTarget, EventName extends string>(
    target: Target,
    eventName: EventName,
    handler: EventHandler<any>,
    options?: boolean | AddEventListenerOptions
  ) => {
    const self = getCurrentEffect()
    if (self) {
      const isOnce = options && typeof options != 'boolean' && options.once
      const userHandler = isFunction(handler)
        ? handler
        : handler.handleEvent.bind(handler)

      handler = event => {
        if (isOnce) {
          self.context?.remove(self)
        }
        userHandler(event)
      }
    }
    target.addEventListener(eventName, handler, options)
    return () => {
      target.removeEventListener(eventName, handler, options)
    }
  }
)
