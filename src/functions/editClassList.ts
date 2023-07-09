import { Ref } from '../observable'
import { DOMClassAttribute } from '../types'
import { classToString } from './classToString'

export function editClassList(
  ref: Ref<DOMClassAttribute>,
  editor: (classList: DOMTokenList) => void
) {
  const str = classToString(ref.peek())
  const { classList } = document.createElement('span')
  classList.add(...str.split(/ +/))
  editor(classList)
  ref.set(classList.toString())
}
