import { ArrayRef } from '../core/observable'
import { ArrayViewRenderFn, useArrayView } from '../hooks/useArrayView'

export interface ArrayViewProps<T> {
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
}: ArrayViewProps<T>) {
  return useArrayView(array, render, deps)
}
