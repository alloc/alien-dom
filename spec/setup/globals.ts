// @ts-nocheck
import { DocumentFragment, Element, parseHTML } from 'linkedom'

globalThis.DEV = true

// TSX seems to emit React.createElement no matter what :|
globalThis.React = {}

const window = parseHTML('<html><body></body></html>')
window.Element = Element

globalThis.window = window
globalThis.document = window.document
globalThis.MutationObserver = window.MutationObserver
globalThis.Element = window.Element
globalThis.NodeList = window.NodeList

const defineToString = (prototype: any, toString: (obj: any) => string) => {
  function toStringMethod() {
    return toString(this)
  }
  if (prototype !== Element.prototype) {
    Object.defineProperty(prototype, 'toString', {
      value: toStringMethod,
    })
  }
  Object.defineProperty(prototype, Symbol.for('nodejs.util.inspect.custom'), {
    value: toStringMethod,
  })
}

defineToString(Element.prototype, element => {
  return element.outerHTML
})

defineToString(DocumentFragment.prototype, fragment => {
  const div = document.createElement('div')
  div.appendChild(fragment.cloneNode(true))
  return '<>' + div.innerHTML + '</>'
})
