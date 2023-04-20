import { syncBooleanAttrProp } from './util'

/**
 * The "value" attribute is special for the <input> element since it sets
 * the initial value. Changing the "value" attribute without changing the
 * "value" property will have no effect since it is only used to the set the
 * initial value.  Similar for the "checked" attribute, and "disabled".
 */
export function morphInputElement(
  fromEl: HTMLInputElement,
  toEl: HTMLInputElement
) {
  syncBooleanAttrProp(fromEl, toEl, 'checked')
  syncBooleanAttrProp(fromEl, toEl, 'disabled')

  if (fromEl.value !== toEl.value) {
    fromEl.value = toEl.value
  }

  if (!toEl.hasAttribute('value')) {
    fromEl.removeAttribute('value')
  }
}
