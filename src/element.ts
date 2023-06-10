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
import { AlienBoundEffect, AlienEffect, AlienEffects } from './effects'
import { canMatch } from './internal/duck'
import { AlienNodeList } from './internal/nodeList'
import { kAlienElementKey } from './internal/symbols'
import { applyProps } from './jsx-dom/jsx-runtime'
import { observeAs } from './signals'
import { updateElement } from './internal/updateElement'
import { EffectFlags, getAlienEffects, enableEffect } from './internal/effects'
import { updateStyle, UpdateStyle } from './jsx-dom/util'
import { unwrap } from './internal/element'
import { Disposable } from './disposable'

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
   * Morph this element into another element. If the given `element` had
   * its `effects` method called, all of its effects will be moved to
   * this element.
   */
  morph(element: Element) {
    const key = kAlienElementKey(this)
    kAlienElementKey(element, key)
    updateElement(this, element)
    return this
  }
  replaceText(value: string): this
  replaceText(value: () => string): Disposable<AlienBoundEffect<this>>
  replaceText(value?: string | (() => string)) {
    if (typeof value == 'function') {
      return observeAs(this, target => {
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
  /**
   * Returns the first class name that matches the given pattern.
   *
   * If a capturing group exists in the pattern, the captured value will
   * be returned. Otherwise, the entire match will be returned.
   *
   * An empty string is returned if no match is found.
   */
  matchClass(pattern: RegExp) {
    for (let i = 0; i < this.classList.length; i++) {
      const token = this.classList.item(i)!
      const match = pattern.exec(token)
      if (match) {
        return match[1] ?? match[0]
      }
    }
    return ''
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
}

export interface AlienElement<Element extends AnyElement>
  extends AnyElement,
    AlienEventMethods<Element>,
    AlienStyleMethods<Element> {
  onChange: AlienEventMethod<this>
  onChangeCapture: AlienEventMethod<this>
  oneChange: AlienEventMethod<this>
  oneChangeCapture: AlienEventMethod<this>

  /**
   * Replace this node with its children.
   */
  unwrap<T extends Node = ChildNode>(): T[]

  /**
   * ⚠️ It's not safe to call this from within a `selfUpdating`
   * component's render function (if this element is returned by the
   * component).
   */
  effects(): AlienEffects<this>

  effect(effect: AlienEffect<void, [], false>): Disposable<typeof effect>
  effect<Args extends any[]>(
    effect: AlienEffect<void, Args, false>,
    args: Args
  ): Disposable<typeof effect>
  effect<T extends object | void, Args extends any[] = []>(
    effect: AlienEffect<T, Args, false>,
    target: T,
    args?: Args
  ): Disposable<typeof effect>

  effectOnce(effect: AlienEffect<void, [], false>): Disposable<typeof effect>
  effectOnce<Args extends any[]>(
    effect: AlienEffect<void, Args, false>,
    args: Args
  ): Disposable<typeof effect>
  effectOnce<T extends object | void, Args extends any[] = []>(
    effect: AlienEffect<T, Args, false>,
    target: T,
    args?: Args
  ): Disposable<typeof effect>

  effectAsync(effect: AlienEffect<void, [], true>): Disposable<typeof effect>
  effectAsync<Args extends any[]>(
    effect: AlienEffect<void, Args, true>,
    args: Args
  ): Disposable<typeof effect>
  effectAsync<T extends object | void, Args extends any[] = []>(
    effect: AlienEffect<T, Args, true>,
    target: T,
    args?: Args
  ): Disposable<typeof effect>

  effectOnceAsync(
    effect: AlienEffect<void, [], true>
  ): Disposable<typeof effect>
  effectOnceAsync<Args extends any[]>(
    effect: AlienEffect<void, Args, true>,
    args: Args
  ): Disposable<typeof effect>
  effectOnceAsync<T extends object | void, Args extends any[] = []>(
    effect: AlienEffect<T, Args, true>,
    target: T,
    args?: Args
  ): Disposable<typeof effect>
}

const setMethodImpl = <ThisArg extends AnyElement, Rest extends any[], Result>(
  obj: { prototype: any },
  name: string,
  method: (first: ThisArg, ...args: Rest) => Result
) =>
  (obj.prototype[name] = function (this: ThisArg, ...args: Rest) {
    return method(this, ...args)
  })

setMethodImpl(AlienElement, 'unwrap', unwrap)
setMethodImpl(AlienElement, 'effects', getAlienEffects)

for (const [suffix, flags] of [
  ['', 0],
  ['Once', EffectFlags.Once],
  ['Async', EffectFlags.Async],
  ['OnceAsync', EffectFlags.Once | EffectFlags.Async],
] as [string, EffectFlags | 0][]) {
  setMethodImpl(
    AlienElement,
    'effect' + suffix,
    function (node, effect: AlienEffect, target?: any, args?: any) {
      return enableEffect(
        getAlienEffects(node),
        effect,
        flags,
        target,
        arguments.length > 2 && args
      )
    }
  )
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
