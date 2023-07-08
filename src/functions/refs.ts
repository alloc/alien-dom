import { ref } from '../observable'
import { attachRef } from './attachRef'

export const refs = <Props extends object>(
  initialProps: Props,
  didSet?: (key: keyof Props, newValue: any, oldValue: any) => void
) => {
  const props = {} as Props
  for (const [key, value] of Object.entries(initialProps)) {
    attachRef(
      props,
      key,
      ref(value),
      didSet as (key: keyof any, newValue: any, oldValue: any) => void
    )
  }
  return props
}
