import { flattenClassProp } from '../internal/flattenClassProp'
import { Ref } from '../observable'
import { DOMClassAttribute } from '../types'

export function editClassList(
  ref: Ref<DOMClassAttribute>,
  editor: (classList: DOMTokenList) => void
) {
  const str = flattenClassProp(ref.peek())
  const { classList } = document.createElement('span')
  classList.add(...str.split(/ +/))
  editor(classList)
  ref.set(classList.toString())
}
