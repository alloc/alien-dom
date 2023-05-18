var NS_XHTML = 'http://www.w3.org/1999/xhtml'

/**
 * Returns true if two node's names are the same.
 *
 * NOTE: We don't bother checking `namespaceURI` because you will never
 *       find two HTML elements with the same nodeName and different
 *       namespace URIs.
 */
export function compareNodeNames(fromEl: Node, toEl: Node): boolean {
  var fromNodeName = fromEl.nodeName
  var toNodeName = toEl.nodeName
  var fromCodeStart, toCodeStart

  if (fromNodeName === toNodeName) {
    return true
  }

  fromCodeStart = fromNodeName.charCodeAt(0)
  toCodeStart = toNodeName.charCodeAt(0)

  // If the target element is a virtual DOM node or SVG node then we
  // may need to normalize the tag name before comparing. Normal HTML
  // elements that are in the "http://www.w3.org/1999/xhtml" are
  // converted to upper case.
  if (fromCodeStart <= 90 && toCodeStart >= 97) {
    // from is upper and to is lower
    return fromNodeName === toNodeName.toUpperCase()
  }
  if (toCodeStart <= 90 && fromCodeStart >= 97) {
    // to is upper and from is lower
    return toNodeName === fromNodeName.toUpperCase()
  }
  return false
}

/**
 * Create an element, optionally with a known namespace URI.
 */
export function createElementNS(
  doc: Document,
  name: string,
  namespaceURI: string | null
): Element {
  return !namespaceURI || namespaceURI === NS_XHTML
    ? doc.createElement(name)
    : doc.createElementNS(namespaceURI, name)
}

/**
 * Copies the children of one DOM element to another DOM element
 */
export function moveChildren(fromEl: Element, toEl: Element) {
  var curChild = fromEl.firstChild
  while (curChild) {
    var nextChild = curChild.nextSibling
    toEl.appendChild(curChild)
    curChild = nextChild
  }
  return toEl
}

export function syncBooleanAttrProp<
  T extends Element,
  P extends string & keyof T
>(fromEl: T, toEl: T, name: P) {
  if (fromEl[name] !== toEl[name]) {
    fromEl[name] = toEl[name]
    if (fromEl[name]) {
      fromEl.setAttribute(name, '')
    } else {
      fromEl.removeAttribute(name)
    }
  }
}
