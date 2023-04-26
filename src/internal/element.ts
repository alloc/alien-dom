import { AlienElement, AlienEvent } from '../element'
import { AnyElement, AnyEvent } from './types'
import { CSSProperties } from '../types/dom'
import { elementEvent } from './elementEvent'
import { AlienBoundEffect } from '../effects'
import { Disposable } from '../disposable'

export const AlienElementPrototype = new Proxy(AlienElement.prototype, {
  get(target, key, receiver) {
    if (typeof key == 'string') {
      const cachedMethod = methodCache[key]
      if (cachedMethod) {
        return cachedMethod
      }
      if (cachedMethod === undefined) {
        const styleMethod = getStyleMethod(key)
        if (styleMethod) {
          return styleMethod
        }
        const eventType = key.match(/^one?([A-Z]\w+?)(?:Capture)?$/)?.[1]
        if (eventType) {
          return getEventMethod(key, eventType.toLowerCase())
        }
        // Cache null results so we don't have to check again.
        methodCache[key] = null
      }
    } else if (key != Symbol.toStringTag) {
      return // toStringTag is the only symbol property we have.
    }

    if (target.hasOwnProperty(key)) {
      return Reflect.get(target, key)
    }

    // Some getters (eg: nodeType) will throw an error if we don't
    // call them with the `receiver` as the `this` context.
    const prop =
      Object.getOwnPropertyDescriptor(Node.prototype, key) ||
      Object.getOwnPropertyDescriptor(EventTarget.prototype, key) ||
      Object.getOwnPropertyDescriptor(Object.prototype, key)

    if (prop && prop.get) {
      return prop.get.call(receiver)
    }

    return Reflect.get(target, key)
  },
})

const styleDeconflict = /* @__PURE__ */ reverseLookup({
  border: 'cssBorder', // HTMLImageElement.border
  content: 'cssContent', // HTMLMetaElement.content
  filter: 'cssFilter', // AlienElement.filter()
  height: 'cssHeight', // HTMLImageElement.height
  transform: 'cssTransform', // SVGElement.transform
  translate: 'cssTranslate', // HTMLElement.translate
  width: 'cssWidth', // HTMLImageElement.width
} as const)

declare const CSS2Properties: any
const cssProperties =
  typeof CSS2Properties != 'undefined'
    ? CSS2Properties.prototype
    : document.body.style

function getStyleMethod(key: any) {
  const styleKey: any =
    styleDeconflict[key as keyof AlienStyleDeconflict] || key
  if (styleKey in cssProperties) {
    return (methodCache[key] = function (this: HTMLElement, value?: any) {
      if (arguments.length == 0) {
        return this.style[styleKey]
      }
      if (value === null) {
        this.style.removeProperty(styleKey)
      } else {
        this.style[styleKey] = value
      }
      return this
    })
  }
}

const methodCache: Record<string, Function | null> = {}

function getEventMethod<Event extends AnyEvent>(
  key: string,
  eventType: string
) {
  const once = key.startsWith('one')
  const passive = eventType == 'scroll'
  const capture = key.endsWith('Capture')
  const baseOptions =
    once || passive || capture ? { once, passive, capture } : undefined

  return (methodCache[key] = function (
    this: Element,
    callback: (event: AlienEvent<Event, Element>) => void,
    options?: boolean | AddEventListenerOptions
  ) {
    if (baseOptions) {
      if (options) {
        options = options == true ? { capture: true } : options
        options = { ...baseOptions, ...options }
      } else {
        options = baseOptions
      }
    }
    return elementEvent(this, eventType, callback, options)
  })
}

function reverseLookup<T extends object>(
  obj: T
): T & { [P in keyof T as string & T[P]]: P } {
  return {
    ...obj,
    ...Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [value, key])
    ),
  }
}

type AlienStyleDeconflict = typeof styleDeconflict

export type AlienStyleMethods<Element extends AnyElement> = {
  [P in keyof CSSProperties as P extends keyof AlienStyleDeconflict
    ? AlienStyleDeconflict[P]
    : P]: {
    (): CSSProperties[P]
    (value: CSSProperties[P] | null): Element
  }
}

export type AlienEventMethod<
  This extends AnyElement,
  Event extends AnyEvent = AnyEvent
> = (
  callback: (this: This, event: AlienEvent<Event, This>) => void,
  options?: boolean | AddEventListenerOptions
) => Disposable<AlienBoundEffect<This>>

export type AlienEventMethods<This extends AnyElement> = {
  [P in keyof Omit<
    HTMLElementEventMap,
    'change'
  > as AlienEventType<P>]: AlienEventMethod<This, HTMLElementEventMap[P]>
}

type AlienEventType<Event extends string> =
  `${AlienEventPrefix}${CamelCaseHTMLEvent<Event>}${AlienEventSuffix<Event>}`

type AlienEventPrefix = 'on' | 'one'
type AlienEventSuffix<Event extends string> =
  | (Event extends HTMLBubblingEvents ? 'Capture' : never)
  | ''

type CamelCaseHTMLEvent<Event extends string> =
  Event extends `${HTMLEventPrefix}${infer Suffix}`
    ? Event extends `${infer Prefix extends string}${Suffix}`
      ? `${Capitalize<Prefix>}${CamelCaseHTMLEvent<Suffix>}`
      : never
    : Capitalize<Event>

type HTMLEventPrefix =
  | 'animation'
  | 'aux'
  | 'before'
  | 'can'
  | 'composition'
  | 'context'
  | 'cue'
  | 'dbl'
  | 'drag'
  | 'duration'
  | 'focus'
  | 'form'
  | 'got'
  | 'loaded'
  | 'lost'
  | 'mouse'
  | 'pointer'
  | 'rate'
  | 'select'
  | 'selection'
  | 'slot'
  | 'time'
  | 'touch'
  | 'transition'
  | 'volume'

type HTMLBubblingEvents =
  | 'blur'
  | 'change'
  | 'click'
  | 'dblclick'
  | 'error'
  | 'focus'
  | 'keydown'
  | 'keyup'
  | 'load'
  | 'mousedown'
  | 'mousemove'
  | 'mouseout'
  | 'mouseover'
  | 'mouseup'
  | 'reset'
  | 'resize'
  | 'scroll'
  | 'select'
  | 'submit'
  | 'unload'

/**
 * Replace this node with its children.
 */
export function unwrap<T extends Node = ChildNode>(node: Node) {
  const children: T[] = []
  const parent = node.parentNode
  if (parent) {
    while (node.firstChild) {
      children.push(node.firstChild as any)
      parent.insertBefore(node.firstChild, node)
    }
    parent.removeChild(node)
  }
  return children
}
