export let window: Window
export let document: Document

export const setPlatform = (platform: {
  window: Window
  document: Document
}): void => void ({ window, document } = platform)

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
