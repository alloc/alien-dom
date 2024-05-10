import { AlienBoundEffect, AlienEffect, AlienEffects } from '../core/effects'
import { observeAs } from '../functions/observeAs'
import type { AlienEventMethods, AlienStyleMethods } from '../global/element'
import type { AlienNodeList } from '../global/nodeList'
import { canMatch } from '../internal/duck'
import { EffectFlags, enableEffect, getEffects } from '../internal/effects'
import type {
  AlienSelect,
  AlienTag,
  AnyElement,
  AnyEvent,
  DefaultElement,
} from '../internal/types'
import { unwrap } from '../internal/unwrap'
import { UpdateStyle, updateStyle } from '../internal/updateStyle'
import { CSSAttributes, JSX } from '../types'
import { AnimationsParam, animate } from './animate'
import { Disposable } from './disposable'
import { patchAttributes } from './element/attributes'
import {
  addClass,
  hasSomeClass,
  matchClass,
  removeClass,
  removeMatchingClass,
} from './element/classList'
import { FromElementProxy } from './elementProxy'

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
  Iterable<Element> & {
    first(): Element | null
    next(): Element | null
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
      [Symbol.iterator]: () => ({
        next() {
          const value = iterable.next()
          return { value, done: !value }
        },
      }),
      next() {
        let sibling: ChildNode | undefined
        while ((sibling = siblings[++cursor]) && sibling != self) {
          if (!selector) {
            return sibling
          }
          if (canMatch(sibling) && sibling.matches(selector)) {
            return sibling
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
  filter<SelectedElement extends AnyElement = Element>(
    selector: string
  ): AlienSelect<SelectedElement, this> | null {
    return this.matches(selector) ? (this as any) : null
  }
  replaceText(value: string): this
  replaceText(value: () => string): Disposable<AlienBoundEffect<Element>>
  replaceText(value?: string | (() => string)) {
    if (typeof value == 'function') {
      return observeAs(this, target => {
        target.textContent = value()
      }) as any
    } else {
      this.textContent = value!
    }
    return this
  }
  empty() {
    while (this.firstChild) {
      this.removeChild(this.firstChild)
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
    return hasSomeClass(this as any, name)
  }
  addClass(name: string) {
    addClass(this as any, name)
    return this
  }
  removeClass(name: string) {
    removeClass(this as any, name)
    return this
  }
  removeMatchingClasses(pattern: RegExp | ((name: string) => boolean | void)) {
    removeMatchingClass(this as any, pattern)
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
    return matchClass(this as any, pattern)
  }
  css(style: CSSAttributes) {
    updateStyle(this as any, style, UpdateStyle.Interrupt)
    return this
  }
  // TODO: update `props` type to allow ReadonlyRef values
  set(props: JSX.InferAttributes<Element>) {
    patchAttributes(this as any, props)
    return this
  }
  spring(animations: AnimationsParam<Element>) {
    animate(this, animations as any)
    return this
  }
}

export interface AlienElement<Element extends AnyElement>
  extends AnyElement,
    AlienEventMethods<Element>,
    AlienStyleMethods<Element> {
  /**
   * Replace this node with its children.
   */
  unwrap<T extends Node = ChildNode>(): T[]

  /**
   * ⚠️ It's not safe to call this from within a `selfUpdating`
   * component's render function (if this element is returned by the
   * component).
   */
  effects(): AlienEffects<FromElementProxy<this>>

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
setMethodImpl(AlienElement, 'effects', getEffects)

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
        getEffects(node),
        effect,
        flags,
        target,
        arguments.length > 2 && args
      )
    }
  )
}
