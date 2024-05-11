import { match } from 'path-to-regexp'
import { Route, RouteConfig } from './objects/Route'
import { Shell, ShellConfig } from './objects/Shell'

export function defineRoute<
  const Path extends string,
  Data = null,
  State extends object | null = null,
>(route: RouteConfig<Path, Data, State>): Route<Path, Data, State> {
  return {
    ...route,
    match: match(route.path),
    async load(path = route.path as any): Promise<any> {
      const app = this.app
      if (!app) {
        throw Error('Route not attached to App instance')
      }
      const match = this.match(path)
      if (!match) {
        throw Error('Path does not match Route')
      }
      const state = this.state ? this.state(match.params) : null
      return await app.load(this, match, state)
    },
    app: undefined,
  }
}

export function defineShell<Data, State extends object | null>(
  shell: ShellConfig<Data, State>
): Shell<Data, State> {
  return shell as any
}
