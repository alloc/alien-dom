import { JSX } from 'alien-dom'
import { MatchFunction } from 'path-to-regexp'
import type { InferParams, PathTemplate } from 'path-types'
import { App } from './App'

export interface RouteConfig<
  Path extends string,
  Data = unknown,
  State extends object | null = null
> {
  path: Path
  shell?: Route
  /**
   * The route can store custom state that is JSON-serializable in the browser's
   * history. That means state created by this function is tied to a particular
   * entry in the browser's history, and is restored when the user navigates
   * back to that entry.
   *
   * To update this state, use the `App#setState` method. Note that it sets the
   * state for the currently active route, so you cannot update the state of a
   * route that is not active.
   *
   * ```tsx
   * app.setState({ ...state, foo: 'bar' })
   * ```
   *
   * Currently, the `setState` call is not type-safe.
   */
  state?: (params: InferParams<Path>) => State
  /**
   * Before the route's `component` is rendered for the first time, this
   * function is called and its promise is resolved. The resolved value is
   * passed to the `component` as `props.data`.
   */
  data?: (params: InferParams<Path> & { state: State }) => Promise<Data>
  /**
   * Set the `document.title` when this route becomes active.
   */
  title: string | ((props: RouteProps<Path, Data, State>) => string)
  /**
   * The component to render when this route becomes active. It's unmounted when
   * another route becomes active, unless that route has its `overlay` config
   * option set to true.
   */
  component: (props: RouteProps<Path, Data, State>) => JSX.Element | null
  /**
   * Periodically refresh the route's `props.data` by calling the `data` config
   * option again.
   */
  syncInterval?: number
  /**
   * Render the route's `component` on top of the previous route's `component`
   * when this route becomes active. The previous route's `component` is not
   * unmounted.
   */
  overlay?: boolean
}

export interface RouteProps<
  Path extends string,
  Data,
  State extends object | null
> {
  data: Awaited<Data>
  params: InferParams<Path>
  state: State
}

export interface Route<
  Path extends string = any,
  Data = any,
  State extends object | null = any
> extends RouteConfig<Path, Data, State> {
  match: MatchFunction<InferParams<Path>>
  load: PathTemplate<Path> extends Path
    ? () => Promise<Data>
    : (path: PathTemplate<Path>) => Promise<Data>
  app?: App<any>
}
