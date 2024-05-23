import { Ref } from '../core/observable'
import { useRef } from './useRef'

export type SetState<T> = Ref<T>[1]

/**
 * Identical to `useState` in React. The idiomatic way to declare UI state in
 * AlienDOM is through the `useRef` hook, which you can destructure into a tuple
 * just like `useState`. For this reason, you should avoid `useState` unless
 * you're migrating a project from React.
 *
 * 🪝 This hook adds 2 to the hook offset.
 */
export const useState = (init => [...useRef(init)]) as {
  <T>(): [value: T | undefined, set: SetState<T | undefined>]
  <T>(init: T | (() => T), deps?: readonly any[]): [value: T, set: SetState<T>]
}
