import { isFunction, isPromiseLike } from '@alloc/is'
import {
  ComputedRef,
  JSX,
  Ref,
  animate,
  arrayRef,
  computed,
  observe,
  renderComponent,
  unmount,
} from 'alien-dom'
import { MatchFunction, MatchResult, compile, match } from 'path-to-regexp'
import type { InferParams, PathTemplate } from 'path-types'
import { Route as RouteElement } from '../elements/Route'
import { ClientRouter, ClientRouterType, Page, PathRouter } from '../router'
import { Route } from './Route'
import { RouteInstance } from './RouteContext'

interface Data {
  ref: ComputedRef<Promise<any>>
  ts: number
}

interface LazyRoute {
  path: string
  match: MatchFunction<any>
  lazyLoad: () => Promise<{ default: Route }>
}

interface RouteMatch<P extends Route | LazyRoute> {
  route: P | undefined
  match: MatchResult<any>
}

type Simplify<T> = {} & { [K in keyof T]: T[K] }

export class App<
  Routes extends object = any,
  RouterType extends ClientRouterType = ClientRouterType
> {
  private router: InstanceType<RouterType>
  private stack: RouteInstance[] = []
  private placeholder: JSX.Element | null = null
  private imports: Promise<any>[] = []
  private importsPromise: Promise<any> | undefined
  private data = new Map<string, Data>()

  readonly routes = arrayRef<Route | LazyRoute>()

  constructor(
    Router: RouterType,
    options?: ConstructorParameters<RouterType>[1]
  ) {
    const router = new Router(async path => {
      const { route, match } = await this.match(path)
      if (!route) {
        throw Error(`No route found for path: ${JSON.stringify(path)}`)
      }

      const instance: RouteInstance = {
        route,
        match,
        node: undefined!,
        enterEffects: undefined,
        leaveEffects: undefined,
        unmount: () => {
          const element = instance.node.firstElementChild
          // TODO: change this to a callback option
          element?.classList.add('pointer-events-none')

          const promises = instance.leaveEffects?.map(effect => {
            let result = effect()
            if (result && !isPromiseLike(result)) {
              if (!element) return
              const animation = result
              result = new Promise<void>(resolve => {
                animate(element, {
                  ...animation,
                  onRest(...args) {
                    animation.onRest?.(...args)
                    resolve()
                  },
                })
              })
            }
            return result
          })

          const disconnect = () => {
            this.stack = this.stack.filter(inst => inst !== instance)
            instance.node = undefined!
            unmount(element)
          }

          // Unmount after all leave effects have completed.
          if (promises?.some(Boolean)) {
            Promise.all(promises).then(disconnect)
          } else {
            disconnect()
          }
        },
      }

      // Provide mount/unmount hooks to the router.
      return {
        mount: (event, popped) => {
          if (instance.node) {
            popped?.forEach(inst => inst.unmount())
            return
          }

          const node = (instance.node = renderComponent(RouteElement, {
            instance,
            transformTitle: options?.siteName
              ? title => (title ? title + ' | ' : '') + options.siteName
              : undefined,
          }))

          const isAppend = route.overlay || popped?.length === 0
          if (isAppend && this.stack.length) {
            const lastRoute = this.stack.at(-1)!
            lastRoute.node.lastChild.after(node.rootNode)
            if (!route.overlay) {
              lastRoute.unmount()
            }
          } else if (popped) {
            const poppedRoute = this.stack.at(-popped.length)!
            poppedRoute.node.firstChild.before(node.rootNode)
            popped.forEach(page => page.unmount())
          } else if (this.stack.length) {
            const lastRoute = this.stack.at(-1)!
            lastRoute.node.firstChild.before(node.rootNode)
            lastRoute.unmount()
          } else {
            this.placeholder?.replaceWith(node.rootNode)
            this.placeholder = null
          }

          this.stack.push(instance)

          // Entrance effects are not triggered if this is the first Route of
          // the session or an event wasn't provided during navigation.
          if (event)
            queueMicrotask(() => {
              const element = instance.node.firstElementChild
              instance.enterEffects?.forEach(effect => {
                const animation = effect()
                if (element && animation) {
                  animate(element, animation)
                }
              })
            })
        },
        unmount: instance.unmount,
      }
    }, options)

    forwardRouterProperties(router, this)
    this.router = router as any
  }

  /**
   * Create an `Observer` that runs your callback when `location.pathname` is changed.
   */
  observePath(callback: (path: string) => void) {
    return observe(this.router.pathnameRef, callback)
  }

  /** @observable */
  get state() {
    return this.router.currentPage?.state.value
  }

  /**
   * Set the state of the current page, replacing any existing state.
   *
   * The state is saved through the `window.history` API and only the bare necessary data should be
   * stored here. Necessary data includes anything the page needs to render correctly when the user
   * navigates back to it.
   *
   * If you want to preserve the scroll position of an element or the page, you should use the
   * `saveScrollTop` method instead of this.
   */
  setState = (state: any) => {
    this.router.setState(state)
  }

  /**
   * Store a `scrollTop` position for an element or the page using the `window.history` API. When
   * the user navigates back to the current page, any stored scroll positions are automatically
   * applied using the provided `selector` (or `"body"` if none is given).
   */
  saveScrollTop(selector?: string) {
    this.router.saveScrollTop(selector)
  }

  /**
   * Wait for all Route imports to resolve.
   */
  get ready() {
    return (
      (this.importsPromise ||= this.imports.length
        ? this.waitForImports()
        : undefined) || Promise.resolve()
    )
  }

  mount(root: HTMLElement) {
    if (this.stack.length) {
      for (const { node: handle } of this.stack) {
        root.append(handle.rootNode)
      }
    } else {
      this.placeholder = <div />
      root.append(this.placeholder)
    }
    this.router.mount()
  }

  private async waitForImports() {
    while (this.imports.length) {
      await this.imports.shift()
    }
    this.importsPromise = undefined
  }

  /**
   * Register a Route.
   */
  use<const Path extends string, Data>(
    route: Route<Path, Data> | Promise<{ default: Route<Path, Data> }>
  ): App<Simplify<Routes & { [key in Path]: Data }>, RouterType>

  use<const Path extends string, Data>(
    // Don't use `path: Path` so unsaved changes within the imported Route take
    // precedence over a generated `.use` call.
    path: string,
    route: () => Promise<{ default: Route<Path, Data> }>
  ): App<Simplify<Routes & { [key in Path]: Data }>, RouterType>

  use(
    arg1: Route | Promise<{ default: Route }> | string,
    arg2?: () => Promise<{ default: Route }>
  ): App<any> {
    if (typeof arg1 === 'string') {
      const path = arg1
      this.routes.push({
        path,
        match: match(path),
        lazyLoad: arg2!,
      })
      return this
    }
    const route = arg1
    if (route instanceof Promise) {
      const index = this.routes.push(null!) - 1
      this.imports.push(
        route.then(({ default: route }) => {
          route.app = this
          this.routes[index] = route
        })
      )
    } else {
      route.app = this
      this.routes.push(route)
    }
    return this
  }

  /**
   * Match a path to a Route.
   */
  async match(path: string): Promise<RouteMatch<Route>> {
    await this.ready
    const result = this.matchSync(path)
    if (result.route && 'lazyLoad' in result.route) {
      const index = this.routes.indexOf(result.route)
      this.imports.push(
        result.route.lazyLoad().then(({ default: route }) => {
          route.app = this
          this.routes[index] = route
        })
      )
      return this.match(path)
    }
    return result as RouteMatch<Route>
  }

  private matchSync(path: string): RouteMatch<Route | LazyRoute> {
    const match = {} as MatchResult<any>
    const route = [...this.routes].find(route => {
      const result = route.match(path)
      if (result) {
        Object.assign(match, result)
        return true
      }
    })
    return { route, match }
  }

  /**
   * Fetch the data for a Route and its match result.
   */
  load<P extends Route>(
    route: P,
    match: MatchResult<InferParams<P['path']>>,
    state: any
  ): Promise<P extends Route<string, infer Data> ? Data : never> {
    if (!route.data) {
      return Promise.resolve(null!)
    }

    const data = this.data.get(match.path) || null
    if (data) {
      const expires = data.ts + (route.syncInterval ?? Infinity) * 1e3
      if (Date.now() < expires) {
        return data.ref.value
      }
    }

    const load = (data: Data | null): Promise<any> => {
      if (data) {
        data.ts = Date.now()
        data.ref.clear()
      } else {
        const { path, params } = match
        data = {
          ts: Date.now(),
          ref: computed(async () => {
            const result = await route.data!({ ...params, state })
            if (route.syncInterval != null) {
              setTimeout(() => {
                if (this.pathname === path) {
                  load(data)
                }
              }, route.syncInterval * 1e3)
            }
            return result
          }),
        }
        this.data.set(path, data)
      }
      return data.ref.value
    }

    return load(data)
  }

  /**
   * Navigate to a Route.
   */
  visit(path: PathTemplate<string & keyof Routes>, event?: Event): Promise<void>
  visit<Path extends string & keyof Routes>(
    path: Path,
    params: InferParams<Path, any>,
    event?: Event
  ): Promise<void>
  async visit(
    path: PathTemplate<string & keyof Routes> | (string & keyof Routes),
    params?: Record<string, string> | Event,
    event?: Event
  ) {
    if (params instanceof Event) {
      event = params
      params = undefined
    } else if (params) {
      path = compile(path)(params) as any
    }
    await this.router.push(path, event)
  }
}

export interface App<
  Routes extends object = any,
  RouterType extends ClientRouterType = ClientRouterType
> {
  /**
   * An observable ref pointing to the current `location.pathname` value.
   */
  readonly pathnameRef: Ref<string>

  /**
   * An observable ref pointing to the current `location.hash` value.
   */
  readonly hashRef: InstanceType<RouterType> extends PathRouter
    ? Ref<string>
    : never

  /**
   * A shortcut for `this.pathnameRef.value`
   * @observable
   */
  readonly pathname: string

  /**
   * A shortcut for `this.hashRef.value`
   * @observable
   */
  readonly hash: InstanceType<RouterType> extends PathRouter ? string : never

  readonly currentPage: Readonly<Page>
  readonly navigating: Promise<void> | null
  readonly session: number
  readonly navStack: ReadonlyArray<Readonly<Page>>
  readonly navIndex: number
}

function forwardRouterProperties(router: ClientRouter, app: App) {
  const skipped = new Set(['options'])
  const prototype = Object.getPrototypeOf(router)

  for (const key of [
    ...Object.getOwnPropertyNames(router),
    ...Object.getOwnPropertyNames(prototype),
    ...Object.getOwnPropertyNames(ClientRouter.prototype),
  ]) {
    const property =
      Object.getOwnPropertyDescriptor(router, key) ||
      Object.getOwnPropertyDescriptor(prototype, key) ||
      Object.getOwnPropertyDescriptor(ClientRouter.prototype, key)

    if (property && !isFunction(property.value) && !skipped.has(key)) {
      Object.defineProperty(app, key, {
        get:
          property.get?.bind(router) ?? Reflect.get.bind(Reflect, router, key),
      })
    }
  }
}
