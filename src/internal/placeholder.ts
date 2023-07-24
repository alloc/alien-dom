import { isComment } from './duck'
import { kAlienElementKey, kAlienPlaceholder } from './symbols'
import { DefaultElement } from './types'

export function getPlaceholder(child: Element | Comment): DefaultElement {
  let placeholder: any
  if (isComment(child)) {
    placeholder = document.createComment(child.textContent || '')
  } else {
    const tagName = child.tagName.toLowerCase()
    placeholder = child.namespaceURI
      ? document.createElementNS(child.namespaceURI, tagName)
      : document.createElement(tagName)
  }
  kAlienPlaceholder(placeholder, child)
  kAlienElementKey(placeholder, kAlienElementKey(child))
  return placeholder
}

export function revertAllPlaceholders<T extends ParentNode | ChildNode>(
  child: T
) {
  child = kAlienPlaceholder<T>(child) || child
  child.childNodes.forEach(grandChild => {
    const oldGrandChild = grandChild
    grandChild = revertAllPlaceholders(grandChild)
    if (oldGrandChild !== grandChild) {
      child.replaceChild(grandChild, oldGrandChild)
    }
  })
  return child
}
