import { animate, SpringAnimation } from './animate'
import { AlienElementMessage, events } from './events'
import { Disposable, AlienHook } from './hooks'
import { canMatch } from './internal/duck'
import { AnyElement, AnyEvent, DefaultElement } from './internal/types'
import { AlienNodeList } from './nodeList'
import { kAlienElementKey, setSymbol } from './symbols'
import { applyProps, updateStyle } from './jsx-dom/jsx-runtime'
import { HTMLAttributes, DetailedHTMLProps } from './types/html'
import { CSSProperties } from './types/dom'
import { SVGAttributes } from './types/svg'
import { targetedEffect } from './signals'
import { elementEvent } from './elementEvents'
import { updateElement } from './updateElement'
import { getAlienHooks } from './internal/hooks'

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
} & (Event extends { relatedTarget: EventTarget }
    ? { relatedTarget: AnyElement }
    : unknown)

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
    callback: (event: T & AlienElementMessage<this>) => void
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
  /**
   * Morph this element into another element. If the given `element` had
   * its `hooks` method called, all of its hooks will be transferred to
   * this element.
   */
  morph(element: Element) {
    const key = kAlienElementKey(this)
    kAlienElementKey(element, key)
    updateElement(this, element)
    return this
  }
  replaceText(value: string): this
  replaceText(value: () => string): Disposable<AlienHook<this>>
  replaceText(value?: string | (() => string)) {
    if (typeof value == 'function') {
      return targetedEffect(this, target => {
        target.textContent = value()
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
  /**
   * Replace this node with its children.
   */
  unwrap<T extends Node = ChildNode>() {
    const children: T[] = []
    const parent = this.parentNode
    if (parent) {
      while (this.firstChild) {
        children.push(this.firstChild as any)
        parent.insertBefore(this.firstChild, this)
      }
      parent.removeChild(this)
    }
    return children
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
    animations:
      | SpringAnimation<Element, any>
      | readonly SpringAnimation<Element, any>[]
  ) {
    animate(this, animations as any)
    return this
  }
  /**
   * ⚠️ It's not safe to call this from within a `selfUpdating`
   * component's render function (if this element is returned by the
   * component).
   */
  hooks() {
    return getAlienHooks(this)
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
) => Disposable<AlienHook<This>>

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

export interface AlienElement<Element extends AnyElement>
  extends AnyElement,
    AlienEventMethods<Element>,
    AlienStyleMethods<Element> {
  onChange: AlienEventMethod<this>
  onChangeCapture: AlienEventMethod<this>
  oneChange: AlienEventMethod<this>
  oneChangeCapture: AlienEventMethod<this>
}

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

/**
 * Allows type casting via tag name (eg: `"a"` → `HTMLAnchorElement`)
 */
export type AlienTag<Element extends AnyElement = DefaultElement> =
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
  [Key in keyof CSSProperties]: CSSProperties[Key] | null
}
