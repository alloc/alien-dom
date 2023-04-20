import { syncBooleanAttrProp } from './util'
import { hasTagName } from '../jsx-dom/util'

export function morphOptionElement(
  fromEl: HTMLOptionElement,
  toEl: HTMLOptionElement
) {
  var parentNode = fromEl.parentNode as HTMLSelectElement | HTMLOptGroupElement
  if (parentNode) {
    if (hasTagName(parentNode, 'OPTGROUP')) {
      parentNode = parentNode.parentNode as HTMLSelectElement
    }
    if (
      hasTagName(parentNode, 'SELECT') &&
      !parentNode.hasAttribute('multiple')
    ) {
      // We have to reset select element's selectedIndex to -1,
      // otherwise setting fromEl.selected using the syncBooleanAttrProp
      // below has no effect. The correct selectedIndex will be set in
      // the `morphSelectElement` function.
      parentNode.selectedIndex = -1
    }
  }
  syncBooleanAttrProp(fromEl, toEl, 'selected')
}
