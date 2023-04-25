import { AlienElementList } from './element'
import { hasForEach } from './internal/duck'
import { AnyElement, DefaultElement } from './internal/types'
import { Disposable } from './disposable'
import { defineEffectType, AlienBoundEffect, createEffect } from './effects'

const globalEvents = new Map<string, Set<Function>>()
const targets = new WeakMap<Element, Map<string, Set<Function>>>()

const emit = (target: any, event: any) => {
  const events = targets.get(target)
  if (events) {
    const callbacks = events.get(event.type)
    if (callbacks) {
      event.currentTarget = target
      callbacks.forEach(callback => callback(event))
    }
  }
  if (target.parentElement) {
    emit(target.parentElement, event)
  }
}

const targetedEvent = /* @__PURE__ */ defineEffectType(
  (target: Element, event: string, callback: (event: any) => void) => {
    const events = targets.get(target) || new Map<string, Set<Function>>()
    targets.set(target, events)

    const callbacks = events.get(event) || new Set<Function>()
    events.set(event, callbacks)

    callbacks.add(callback!)
    return () => {
      callbacks.delete(callback!)
      if (!callbacks.size) {
        events.delete(event)
        if (!events.size) {
          targets.delete(target as Element)
        }
      }
    }
  }
)

const globalEvent = /* @__PURE__ */ defineEffectType(
  (event: string, callback: (event: any) => void) => {
    const callbacks = globalEvents.get(event) || new Set()
    globalEvents.set(event, callbacks)

    callbacks.add(callback!)
    return () => {
      callbacks.delete(callback!)
      if (!callbacks.size) {
        globalEvents.delete(event)
      }
    }
  }
)

export const events: AlienMessenger = {
  on(
    event: string,
    arg2: Element | AlienElementList | ((event: any) => void),
    arg3?: (event: any) => void
  ): Disposable<AlienBoundEffect> {
    let target: Element | AlienElementList | undefined
    let callback: ((event: any) => void) | undefined
    if (typeof arg2 == 'function') {
      callback = arg2
    } else {
      target = arg2
      callback = arg3!
    }
    if (target) {
      if (!(target instanceof Element)) {
        return createEffect({
          target,
          enable(targets: AlienElementList) {
            const effects = targets.map(target =>
              targetedEvent(target, event, callback!)
            )
            return () => effects.forEach(effect => effect.dispose())
          },
        })
      }
      return targetedEvent(target, event, callback)
    }
    return globalEvent(event, callback)
  },
  dispatch(
    type: string,
    target?: Record<string, any> | Element | AlienElementList,
    event?: Record<string, any>
  ) {
    if (target && hasForEach(target)) {
      return target.forEach(target => {
        this.dispatch(type, target, event)
      })
    }
    if (arguments.length == 2 && !(target instanceof Element)) {
      event = target
      target = undefined
    }
    event ||= {}
    event.type = type
    if (target) {
      event.target = target
      emit(target, event)
    } else {
      const callbacks = globalEvents.get(type)
      callbacks?.forEach(callback => callback(event))
    }
  },
}

interface AlienMessenger {
  on<T extends Record<string, any>, Element extends AnyElement>(
    this: AlienMessenger,
    event: string,
    target: Element,
    handler: (event: T & AlienElementMessage<Element>) => void
  ): Disposable<AlienBoundEffect<Element>>
  on<T extends Record<string, any>, Element extends AnyElement>(
    this: AlienMessenger,
    event: string,
    target: AlienElementList<Element>,
    handler: (event: T & AlienElementMessage<Element>) => void
  ): Disposable<AlienBoundEffect<AlienElementList<Element>>>
  on<T extends Record<string, any>>(
    this: AlienMessenger,
    event: string,
    handler: (event: T & AlienMessage) => void
  ): Disposable<AlienBoundEffect<string>>

  dispatch(
    this: AlienMessenger,
    event: string,
    data?: Record<string, any>
  ): void
  dispatch(
    this: AlienMessenger,
    event: string,
    target: Element | AlienElementList,
    data?: Record<string, any>
  ): void
}

export type AlienMessage = Record<string, any> & {
  readonly type: string
}

export type AlienElementMessage<Element extends AnyElement = DefaultElement> =
  AlienMessage & {
    readonly target: AnyElement
    currentTarget: Element
  }
