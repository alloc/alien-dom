import type {
  AlienEventMethod,
  AlienEventMethods,
  AlienStyleMethods,
} from './internal/element'
import type { HTMLAttributes, DetailedHTMLProps } from './types/html'
import type { SVGAttributes } from './types/svg'
import type {
  AnyElement,
  AnyEvent,
  DefaultElement,
  StyleAttributes,
} from './internal/types'
import { animate, AnimationsParam } from './animate'
import { AlienElementMessage, events } from './events'
import { Disposable, AlienHook, AlienEnabler } from './hooks'
import { canMatch } from './internal/duck'
import { AlienNodeList } from './internal/nodeList'
import { kAlienElementKey } from './symbols'
import { applyProps } from './jsx-dom/jsx-runtime'
import { targetedEffect } from './signals'
import { updateElement } from './internal/updateElement'
import { getAlienHooks } from './internal/hooks'
import { updateStyle, UpdateStyle } from './jsx-dom/util'

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
  css(style: StyleAttributes) {
    updateStyle(this as any, style, UpdateStyle.Interrupt)
    return this
  }
  set(props: Partial<Attributes<Element>>) {
    applyProps(this as any, props)
    return this
  }
  spring(animations: AnimationsParam<Element, any>) {
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
  effect(enabler: AlienEnabler<void, [], false>): Disposable<typeof enabler>
  effect<Args extends any[]>(
    enabler: AlienEnabler<void, Args, false>,
    args: Args
  ): Disposable<typeof enabler>
  effect<T extends object | void, Args extends any[] = []>(
    enabler: AlienEnabler<T, Args, false>,
    target: T,
    args?: Args
  ): Disposable<typeof enabler>
  effect(enabler: any, arg2?: any, arg3?: any) {
    return this.hooks().enable(enabler, arg2, arg3)
  }
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

type Attributes<Element extends AnyElement> = (Element extends HTMLElement
  ? DetailedHTMLProps<HTMLAttributes<Element>, Element>
  : unknown) &
  (Element extends SVGElement ? SVGAttributes<Element> : unknown)
