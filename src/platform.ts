export let window: Window
export let document: Document
export let Element: typeof globalThis.Element
export let MutationObserver: typeof globalThis.MutationObserver

export const setPlatform = (platform: {
  window: Window
  document: Document
  Element: typeof globalThis.Element
  MutationObserver: typeof globalThis.MutationObserver
}): void => void ({ window, document, Element, MutationObserver } = platform)

export interface Window {
  readonly devicePixelRatio: number
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void
}

export interface Document {
  readonly body: HTMLElement
  querySelector(selector: string): Element | null
  querySelectorAll(selector: string): NodeListOf<Element>
  createElement(tag: string): Element
  createElementNS(namespaceURI: string, tag: string): Element
  createTextNode(text: string): Text
  createComment(text: string): Comment
  createDocumentFragment(): DocumentFragment
}
