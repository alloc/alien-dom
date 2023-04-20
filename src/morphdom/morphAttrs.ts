import { kFragmentNodeType } from '../internal/constants'

export function morphAttrs(fromNode: Element, toNode: Element) {
  var toNodeAttrs = toNode.attributes
  var attr
  var attrName
  var attrNamespaceURI
  var attrValue
  var fromValue

  // document-fragments dont have attributes so lets not do anything
  if (
    toNode.nodeType === kFragmentNodeType ||
    fromNode.nodeType === kFragmentNodeType
  ) {
    return
  }

  // update attributes on original DOM element
  for (var i = toNodeAttrs.length - 1; i >= 0; i--) {
    attr = toNodeAttrs[i]
    attrName = attr.name
    attrNamespaceURI = attr.namespaceURI
    attrValue = attr.value

    if (attrNamespaceURI) {
      attrName = attr.localName || attrName
      fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrName)

      if (fromValue !== attrValue) {
        if (attr.prefix === 'xmlns') {
          attrName = attr.name // It's not allowed to set an attribute with the XMLNS namespace without specifying the `xmlns` prefix
        }
        fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue)
      }
    } else {
      fromValue = fromNode.getAttribute(attrName)

      if (fromValue !== attrValue) {
        fromNode.setAttribute(attrName, attrValue)
      }
    }
  }

  // Remove any extra attributes found on the original DOM element that
  // weren't found on the target element.
  var fromNodeAttrs = fromNode.attributes

  for (var d = fromNodeAttrs.length - 1; d >= 0; d--) {
    attr = fromNodeAttrs[d]
    attrName = attr.name
    attrNamespaceURI = attr.namespaceURI

    if (attrNamespaceURI) {
      attrName = attr.localName || attrName

      if (!toNode.hasAttributeNS(attrNamespaceURI, attrName)) {
        fromNode.removeAttributeNS(attrNamespaceURI, attrName)
      }
    } else {
      if (!toNode.hasAttribute(attrName)) {
        fromNode.removeAttribute(attrName)
      }
    }
  }
}
