import { copyAnimatedStyle, setNonAnimatedStyle } from '../internal/animate'
import { DefaultElement } from '../internal/types'

export function morphAttributes(fromNode: Element, toNode: Element) {
  var toNodeAttrs = toNode.attributes
  var attr
  var attrName
  var attrNamespaceURI
  var attrValue
  var fromValue

  copyAnimatedStyle(fromNode as any, toNode as any)

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
          // It's not allowed to set an attribute with the XMLNS
          // namespace without specifying the `xmlns` prefix.
          attrName = attr.name
        }
        fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue)
      }
    } else {
      fromValue = fromNode.getAttribute(attrName)

      if (fromValue !== attrValue) {
        if (attrName === 'style') {
          // Morphing should never interrupt animations.
          setNonAnimatedStyle(fromNode as DefaultElement, attrValue)
        } else {
          fromNode.setAttribute(attrName, attrValue)
        }
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
        if (attrName === 'style') {
          // Morphing should never interrupt animations.
          setNonAnimatedStyle(fromNode as DefaultElement, attr.value, true)
        } else {
          fromNode.removeAttribute(attrName)
        }
      }
    }
  }
}
