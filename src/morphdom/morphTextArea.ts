export function morphTextAreaElement(
  fromEl: HTMLTextAreaElement,
  toEl: HTMLTextAreaElement
) {
  var newValue = toEl.value
  if (fromEl.value !== newValue) {
    fromEl.value = newValue
  }

  var firstChild = fromEl.firstChild
  if (firstChild) {
    // Needed for IE. Apparently IE sets the placeholder as the
    // node value and vise versa. This ignores an empty update.
    var oldValue = firstChild.nodeValue

    if (oldValue == newValue || (!newValue && oldValue == fromEl.placeholder)) {
      return
    }

    firstChild.nodeValue = newValue
  }
}
