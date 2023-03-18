import { effect } from '@preact/signals-core'
import { animate, SpringAnimation } from './animate'
import { AlienSubscription, trackSubscription } from './context'
import { AlienElementMessage, events } from './events'
import { AlienHooks } from './hooks'
import { canMatch } from './internal/duck'
import { AnyElement, AnyEvent, DefaultElement } from './internal/types'
import { AlienNodeList } from './node-list'
import { kAlienHooks } from './symbols'
import { applyProps, updateStyle } from './jsx-dom/jsx'
import {
  DetailedHTMLProps,
  HTMLAttributes,
  SVGAttributes,
} from './jsx-dom/types/index'

declare global {
  interface Element {
    readonly childNodes: AlienElementList<Element>
    cloneNode(deep?: boolean): this
    matches(selectors: string): boolean
    matches<Element extends AlienTag<DefaultElement>>(
      selectors: string
    ): this is AlienSelect<Element>
  }
  interface HTMLElement extends AlienElement<HTMLElement> {
    readonly childNodes: AlienElementList
  }
  interface SVGElement extends AlienElement<SVGElement> {
    readonly childNodes: AlienElementList<SVGElement>
  }
}

export interface AlienElementList<Element extends Node = DefaultElement>
  extends NodeListOf<Element>,
    AlienNodeList<Element> {
  [index: number]: Element
  forEach(
    iterator: (
      value: Element,
      key: number,
      parent: AlienElementList<Element>
    ) => void
  ): void
  forEach<This>(
    iterator: (
      this: This,
      value: Element,
      key: number,
      parent: AlienElementList<Element>
    ) => void,
    thisArg: This
  ): void
}

export type AlienElementIterator<Element extends AnyElement> =
  IterableIterator<Element> & {
    first(): Element | null
  }

export type AlienEvent<
  Event extends AnyEvent = AnyEvent,
  Element extends AnyElement = DefaultElement
> = Event & {
  currentTarget: Element
  target: AnyElement
}

type AlienParentElement<Element extends AnyElement> =
  | (Element extends SVGElement ? SVGElement : never)
  | HTMLElement
  | Document

export class AlienElement<Element extends AnyElement = DefaultElement> {
  $<SelectedElement extends AlienTag<Element> = Element>(
    selector: string
  ): AlienSelect<SelectedElement, this> | null {
    return this.querySelector(selector) as any
  }
  $$<SelectedElement extends AlienTag<Element> = Element>(
    selector: string
  ): AlienElementList<AlienSelect<SelectedElement, this>> {
    return this.querySelectorAll(selector) as any
  }
  siblings<SelectedElement extends AlienTag<Element> = Element>(
    selector?: string
  ): AlienElementIterator<AlienSelect<SelectedElement, this>> {
    const self = this
    const siblings = this.parentNode
      ? Array.from(this.parentNode.childNodes)
      : []

    let cursor = -1
    const iterable: AlienElementIterator<any> = {
      [Symbol.iterator]() {
        return iterable
      },
      next() {
        let sibling: ChildNode | undefined
        while ((sibling = siblings[++cursor]) && sibling != self) {
          if (!selector) {
            return sibling as any
          }
          if (canMatch(sibling) && sibling.matches(selector)) {
            return sibling as any
          }
        }
      },
      first() {
        for (const sibling of siblings) {
          if (sibling == self) {
            continue
          }
          if (!selector) {
            return sibling as any
          }
          if (canMatch(sibling) && sibling.matches(selector)) {
            return sibling as any
          }
        }
      },
    }

    return iterable
  }
  filter<SelectedElement extends AnyElement = this>(
    selector: string
  ): AlienSelect<SelectedElement, this> | null {
    return this.matches(selector) ? (this as any) : null
  }
  /**
   * Listen for `AlienElementMessage` messages that are dispatched
   * from the global `events` messenger with a target of this element
   * or one of its descendants.
   */
  on<T extends Record<string, any>>(
    name: string,
    callback: (event: T & AlienElementMessage<Element>) => void
  ) {
    return events.on(name, this, callback)
  }
  /**
   * Dispatch a bubbling `AlienElementMessage` with the global
   * `events` messenger.
   */
  dispatch<T extends Record<string, any>>(name: string, data?: T) {
    events.dispatch(name, this, data)
  }
  $text(): string
  $text(value: string): this
  $text(value: () => string): AlienSubscription
  $text(value?: string | (() => string)) {
    if (arguments.length == 0) {
      return this.textContent
    }
    if (typeof value == 'function') {
      const dispose = effect(() => {
        this.textContent = value()
      })
      return trackSubscription({
        target: this,
        key: 'textContent',
        dispose,
      })
    } else {
      this.textContent = value!
    }
    return this
  }
  empty() {
    if (this instanceof HTMLElement) {
      while (this.firstChild) {
        this.removeChild(this.firstChild)
      }
    } else {
      this
    }
    return this
  }
  appendTo(parent: AlienParentElement<Element>) {
    parent.appendChild(this)
    return this
  }
  prependTo(parent: AlienParentElement<Element>) {
    parent.insertBefore(this, parent.firstChild)
    return this
  }
  hasClass(name: string) {
    return this.classList.contains(name)
  }
  addClass(name: string) {
    this.classList.add(name)
    return this
  }
  removeClass(name: string) {
    this.classList.remove(name)
    return this
  }
  toggleClass(name: string, value?: boolean) {
    return this.classList.toggle(name, value)
  }
  css(style: Partial<StyleAttributes>) {
    updateStyle(this as any, style)
    return this
  }
  set(props: Partial<Attributes<Element>>) {
    applyProps(this as any, props)
    return this
  }
  spring(
    animations: SpringAnimation<Element> | readonly SpringAnimation<Element>[]
  ) {
    animate(this, animations as any)
    return this
  }
  hooks(): AlienHooks<Element> {
    let hooks: any = Reflect.get(this, kAlienHooks)
    if (!hooks) {
      hooks = new AlienHooks(this)
      Object.defineProperty(this, kAlienHooks, { value: hooks })
    }
    return hooks
  }
  /**
   * Enable hooks, if any, for this element. Call this instead of
   * `hooks().enable()` if you don't want to create an `AlienHooks`
   * instance unnecessarily.
   *
   * Note: You should only use this if you're also using `disableHooks`
   * (see its note for valid use cases).
   */
  enableHooks() {
    const hooks = Reflect.get(this, kAlienHooks) as
      | AlienHooks<Element>
      | undefined
    hooks?.enable()
    return this
  }
  /**
   * Disable hooks, if any, for this element. Call this instead of
   * `hooks().disable()` if you don't want to create an `AlienHooks`
   * instance unnecessarily.
   *
   * Note: You should only use this if you're keeping an element in the
   * DOM but don't want its hooks to run.
   */
  disableHooks() {
    const hooks = Reflect.get(this, kAlienHooks) as
      | AlienHooks<Element>
      | undefined
    hooks?.disable()
    return this
  }
}

const methodCache: Record<string, Function | null> = {}

const styleDeconflict = reverseLookup({
  border: 'cssBorder', // HTMLImageElement.border
  content: 'cssContent', // HTMLMetaElement.content
  filter: 'cssFilter', // AlienElement.filter()
  height: 'cssHeight', // HTMLImageElement.height
  transform: 'cssTransform', // SVGElement.transform
  translate: 'cssTranslate', // HTMLElement.translate
  width: 'cssWidth', // HTMLImageElement.width
} as const)

type AlienStyleDeconflict = typeof styleDeconflict

type AlienStyleMethods<Element extends AnyElement> = {
  [P in keyof StyleAttributes as P extends keyof AlienStyleDeconflict
    ? AlienStyleDeconflict[P]
    : P]: {
    (): StyleAttributes[P]
    (value: StyleAttributes[P] | null): Element
  }
}

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

type AlienEventMethod<
  This extends AnyElement,
  Event extends AnyEvent = AnyEvent
> = (
  callback: (this: This, event: AlienEvent<Event, This>) => void,
  options?: boolean | AddEventListenerOptions
) => AlienSubscription<This, string>

type AlienEventMethods<This extends AnyElement> = {
  [P in keyof Omit<
    HTMLElementEventMap,
    'change'
  > as AlienEventType<P>]: AlienEventMethod<This, HTMLElementEventMap[P]>
}

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
  ): AlienSubscription<Element, string> {
    if (baseOptions) {
      if (options) {
        options = options == true ? { capture: true } : options
        options = { ...baseOptions, ...options }
      } else {
        options = baseOptions
      }
    }
    this.addEventListener(eventType, callback as any, options)
    return trackSubscription({
      target: this,
      key,
      dispose: () => {
        this.removeEventListener(eventType, callback as any, options)
      },
    })
  })
}

export interface AlienElement<Element extends AnyElement>
  extends AnyElement,
    AlienEventMethods<Element>,
    AlienStyleMethods<Element> {
  onChange: AlienEventMethod<this>
  onChangeCapture: AlienEventMethod<this>
  oneChange: AlienEventMethod<this>
  oneChangeCapture: AlienEventMethod<this>
}

const prototype = new Proxy(AlienElement.prototype, {
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

Object.setPrototypeOf(prototype, Node.prototype)
Object.setPrototypeOf(Element.prototype, prototype)

/**
 * Allows type casting via tag name (eg: `"a"` → `HTMLAnchorElement`)
 */
export type AlienTag<Element extends AnyElement> =
  | Element
  | (Element extends HTMLElement
      ? HTMLElement | keyof HTMLElementTagNameMap
      : never)
  | SVGElement
  | keyof SVGElementTagNameMap

type LooseAccess<T, K> = K extends keyof T ? T[K] : never

type AlienTagNameMap<Element extends AnyElement> = Element extends any
  ?
      | SVGElementTagNameMap
      | ([AnyElement] extends [Element]
          ? HTMLElementTagNameMap
          : Element extends HTMLElement
          ? HTMLElementTagNameMap
          : never)
  : never

/**
 * Coerce an `AlienTag<Element>` to an `Element`.
 */
export type AlienSelect<
  T extends string | AnyElement,
  Context extends AnyElement = AnyElement
> = T extends string
  ? AlienTagNameMap<Context> extends infer TagNameMap
    ? TagNameMap extends any
      ? Extract<LooseAccess<TagNameMap, T>, Node>
      : never
    : never
  : T

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

type Attributes<Element extends AnyElement> = (Element extends HTMLElement
  ? DetailedHTMLProps<HTMLAttributes<Element>, Element>
  : unknown) &
  (Element extends SVGElement ? SVGAttributes<Element> : unknown)

type StyleAttributes = {
  [Key in keyof CSSStyleDeclaration]: CSSStyleDeclaration[Key] extends infer Value
    ? Value | null | (Key extends LengthKey ? number : never)
    : never
}

type LengthKey =
  | 'width'
  | 'maxWidth'
  | 'minWidth'
  | 'height'
  | 'maxHeight'
  | 'minHeight'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'margin'
  | 'marginTop'
  | 'marginRight'
  | 'marginBottom'
  | 'marginLeft'
  | 'padding'
  | 'paddingTop'
  | 'paddingRight'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'borderWidth'
  | 'borderTopWidth'
  | 'borderRightWidth'
  | 'borderBottomWidth'
  | 'borderLeftWidth'
  | 'borderRadius'
  | 'borderTopLeftRadius'
  | 'borderTopRightRadius'
  | 'borderBottomLeftRadius'
  | 'borderBottomRightRadius'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'wordSpacing'
