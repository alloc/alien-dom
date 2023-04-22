import { CSSProperties } from '../types/dom'

export type AnyElement = Element
export type DefaultElement = HTMLElement | SVGElement
export type AnyEvent = Event

export type StyleAttributes = {
  [Key in keyof CSSProperties & keyof CSSStyleDeclaration]:
    | CSSProperties[Key]
    | null
}

/**
 * The `currentMode` stack is mutated by self-updating components and
 * the built-in `ManualUpdates` component.
 *
 * ⎯⎯⎯⎯⎯
 *
 * In `noop` mode, a JSX element is basically a `document.createElement`
 * call and a JSX child is basically a `parent.appendChild` call.
 *
 * **This is the initial mode.**
 *
 * ⎯⎯⎯⎯⎯
 *
 * In `ref` mode, a JSX element gets swapped for its cached DOM node, so
 * that callbacks have a stable reference to the DOM node that is
 * actually mounted. It also affects how JSX children are processed. For
 * example, it might replace a cached DOM node with a placeholder.
 *
 * This mode is enabled inside the render function of a self-updating
 * component.
 *
 * ⎯⎯⎯⎯⎯
 *
 * In `deref` mode, JSX children are always dereferenced to their cached
 * DOM nodes when possible. Before being appended, DOM nodes are crawled
 * to ensure any placeholders are replaced.
 *
 * This mode is enabled for descendants of a `<ManualUpdates>` element.
 */
export type ElementMode = 'deref' | 'ref' | 'noop'
