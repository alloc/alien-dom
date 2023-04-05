import { batch } from '@preact/signals-core'
import { AnyElement } from './types'
import { kAlienElementTags, setSymbol } from '../symbols'

type UpdatePropFn<Prop extends keyof any = keyof any> = (
  prop: Prop,
  value: any
) => void

/**
 * Get the prop updater for the given function component and update the
 * props, returning `true` if successful.
 */
export function updateTagProps(element: AnyElement, tag: any, props: any) {
  const tags: Map<any, UpdatePropFn> = (element as any)[kAlienElementTags]
  if (tags) {
    const updateProp = tags.get(tag)
    if (updateProp) {
      batch(() => {
        for (const key in props) {
          updateProp(key, props[key])
        }
      })
      return true
    }
  }
}

/**
 * Associate a tag with an element, so that the element can have its
 * props updated when referenced by its element key in a rerender.
 */
export function assignTag(
  element: AnyElement,
  tag: any,
  updateProp: UpdatePropFn<any>
) {
  const tags: Map<any, UpdatePropFn> =
    (element as any)[kAlienElementTags] || new Map()
  setSymbol(element, kAlienElementTags, tags)
  tags.set(tag, updateProp)
}
