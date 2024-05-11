import { MatchFunction } from 'path-to-regexp'
import type { InferParams, PathTemplate } from 'path-types'
import { App } from './App'

export interface RouteConfig<
  Path extends string,
  Data = unknown,
  State extends object | null = null,
> {
  path: Path
  shell?: Route
  state?: (params: InferParams<Path>) => State
  data?: (params: InferParams<Path> & { state: State }) => Promise<Data>
  title: string | ((props: RouteProps<Path, Data, State>) => string)
  component: (props: RouteProps<Path, Data, State>) => JSX.Element | null
  syncInterval?: number
  overlay?: boolean
}

export interface RouteProps<
  Path extends string,
  Data,
  State extends object | null,
> {
  data: Awaited<Data>
  params: InferParams<Path>
  state: State
}

export interface Route<
  Path extends string = any,
  Data = any,
  State extends object | null = any,
> extends RouteConfig<Path, Data, State> {
  match: MatchFunction<InferParams<Path>>
  load: PathTemplate<Path> extends Path
    ? () => Promise<Data>
    : (path: PathTemplate<Path>) => Promise<Data>
  app?: App<any>
}
