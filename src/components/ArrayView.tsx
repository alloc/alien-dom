import { ArrayRef } from '../core/observable'
import {
  ArrayViewOptions,
  ArrayViewRenderFn,
  useArrayView,
} from '../hooks/useArrayView'

export interface ArrayViewProps<T> extends ArrayViewOptions<T> {
  array: ArrayRef<T>
  children: ArrayViewRenderFn<T>
  /**
   * By default, the array items are re-rendered only if the `children` function
   * is changed. For explicit control of the re-rendering, you can provide a
   * `deps` array.
   */
  deps?: readonly any[]
}

export function ArrayView<T>({
  array,
  children: render,
  deps,
  ...options
}: ArrayViewProps<T>) {
  return useArrayView(array, options, render, deps)
}
