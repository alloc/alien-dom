import { hasTagName } from '../jsx-dom/util'

export function morphSelectElement(
  fromEl: HTMLSelectElement,
  toEl: HTMLSelectElement
) {
  if (!toEl.hasAttribute('multiple')) {
    var selectedIndex = -1
    var i = 0
    // We have to loop through children of fromEl, not toEl since nodes
    // can be moved from toEl to fromEl directly when morphing. At the
    // time this special handler is invoked, all children have already
    // been morphed and appended to / removed from fromEl, so using
    // fromEl here is safe and correct.
    var curChild = fromEl.firstChild
    var optgroup
    while (curChild) {
      if (hasTagName(curChild, 'OPTGROUP')) {
        optgroup = curChild
        curChild = optgroup.firstChild
      } else {
        if (hasTagName(curChild, 'OPTION')) {
          if (curChild.hasAttribute('selected')) {
            selectedIndex = i
            break
          }
          i++
        }
        curChild = curChild.nextSibling
        if (!curChild && optgroup) {
          curChild = optgroup.nextSibling
          optgroup = null
        }
      }
    }

    fromEl.selectedIndex = selectedIndex
  }
}
