import { Ref } from '../core/observable'
import { flattenClassProp } from '../internal/flattenClassProp'
import { HTMLClassAttribute } from '../types'

export function editClassList(
  ref: Ref<HTMLClassAttribute>,
  editor: (classList: DOMTokenList) => void
) {
  const str = flattenClassProp(ref.peek())
  const { classList } = document.createElement('span')
  classList.add(...str.split(/ +/))
  editor(classList)
  ref.set(classList.toString())
}
