import { kAlienElementKey, kAlienElementPosition } from '../internal/symbols'

/**
 * If no element key was explicitly defined by user code and the compiler
 * couldn't assign a statically defined key, then the element's JSX position is
 * used, which might also be undefined if the element was added to the DOM
 * through a native DOM API.
 */
export function getElementKey(element: object): string | undefined {
  return kAlienElementKey(element) ?? kAlienElementPosition(element)
}
