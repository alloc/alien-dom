import { HTML, isElement, isNode, Ref, ref } from 'alien-dom'

export type PageRecord = [
  session: number,
  time: number,
  state?: any,
  scrollTops?: Record<string, number>
]

export interface Page extends ResolvedPath {
  time: number
  path: string
  pathname: string
  state: Ref<any>
  session: number
  scrollTops?: Record<string, number>
}

export interface ResolvedPath {
  /**
   * Called when the page is navigated to. The `event` argument exists except
   * when going back in history, when the page is initially loaded, or when the
   * `push` method isn't provided an event. The `popped` argument is an array of
   * pages that were popped from the stack. It's empty when going forward in
   * history. It's undefined when navigating to a new page.
   *
   * Note: The `mount` hook is also called when going back to a page. This could
   * mean the page is already mounted if you allow overlaying pages.
   */
  mount: (event?: Event, popped?: Page[]) => void
  /**
   * This method is never called by the router. Your `mount` hook should use it
   * to unmount popped pages.
   */
  unmount: () => void
}

export type PathResolver = {
  (path: string): Promise<ResolvedPath>
}

export type ClientRouterType = {
  new (resolvePath: PathResolver, options?: ClientRouterOptions): ClientRouter
}

export interface ClientRouterOptions {
  siteName?: string
}

export abstract class ClientRouter<
  Options extends ClientRouterOptions = ClientRouterOptions
> {
  readonly pathnameRef = ref('')
  session = Date.now()
  navigating: Promise<void> | null = null
  navStack: Page[] = []
  navIndex = -1

  constructor(
    readonly resolvePathname: PathResolver,
    readonly options: Options = {} as Options
  ) {}

  protected abstract getPathname(location: URL | Location): string
  protected abstract getPath(pathname: string, location: URL | Location): string

  get pathname() {
    return this.pathnameRef.value
  }

  get currentPage() {
    return this.navStack[this.navIndex]
  }

  /**
   * Attach event listeners to the window and document, then mount the initial page.
   */
  mount() {
    window.addEventListener('popstate', this.pop)
    document.addEventListener('click', this.onClick, {
      capture: true,
      passive: false,
    })

    queueMicrotask(() => {
      if (!this.navigating) {
        const pathname = this.getPathname(location)
        this.navigate(pathname + location.search + location.hash)
      }
    })
  }

  /**
   * Note: This doesn't unmount the current page. It only removes event listeners from the window
   * and document.
   */
  unmount() {
    window.removeEventListener('popstate', this.pop)
    document.removeEventListener('click', this.onClick)
  }

  push(path: string, event?: Event) {
    const navigating = (this.navigating = (
      this.navigating ?? Promise.resolve()
    ).finally(async () => {
      if (navigating === this.navigating) {
        const pathname = this.getPathname(new URL(path, location.origin))
        const resolved = await this.maybeResolvePathname(pathname)

        if (navigating === this.navigating) {
          this.navigating = null

          const popped = this.getPopped()
          this.navigateSync(path, resolved, ref(null))
          this.onPageChange(event, popped)
        }
      }
    }))
    return navigating
  }

  pop = (event?: PopStateEvent) => {
    this.onLocationChange?.()

    if (event) {
      const { currentPage, navIndex: index, navStack: stack } = this
      const pathname = this.getPathname(location)

      // Detect a hash change, which will have no event.state when location.hash was set directly.
      // In this case, inherit the state of the current page.
      let eventState = event.state as PageRecord | undefined
      if (
        !eventState &&
        index === stack.length - 1 &&
        currentPage.pathname === pathname
      ) {
        eventState = [currentPage.session, Date.now(), currentPage.state.value]
      }

      if (eventState) {
        const [session, time, state] = eventState
        const goingForward = session > this.session || time > stack[index].time

        // We're either going forward in time or back to an old page not yet in the stack.
        if (goingForward || index === 0) {
          this.maybeResolvePathname(pathname).then(resolved => {
            const page: Page = {
              ...resolved,
              time,
              path: this.getPath(pathname, location),
              pathname,
              state: ref(state),
              session,
            }
            if (goingForward) {
              this.navStack.push(page)
              this.navIndex++
              this.onPageChange(event, [])
            } else {
              this.navStack.unshift(page)
              this.onPop()
            }
          })
          return
        }
      }

      // If the event.state is missing, just pop the current page.
      if (index > 0) {
        this.navIndex--
        this.onPop()
      }
    } else if (this.navIndex > 0) {
      history.back()
    }
  }

  setState(state: any) {
    const page = this.currentPage
    if (page) {
      page.state.value = state
      history.replaceState(
        makePageRecord(page.session, page.time, state, page.scrollTops),
        ''
      )
    } else {
      throw Error('Cannot setState on an empty stack')
    }
  }

  saveScrollTop(selector = 'body') {
    const page = this.currentPage
    if (page) {
      const target = document.querySelector(selector)
      if (!target) {
        throw Error(`No element found for selector "${selector}"`)
      }
      page.scrollTops ||= {}
      page.scrollTops[selector] = target.scrollTop
      history.replaceState(
        makePageRecord(
          page.session,
          page.time,
          page.state.peek(),
          page.scrollTops
        ),
        ''
      )
    } else {
      throw Error('Cannot saveScrollTop on an empty stack')
    }
  }

  /**
   * If the pathname is already equal to the current page's pathname, skip pathname resolution since
   * the existing page element will be reused.
   */
  private async maybeResolvePathname(pathname: string): Promise<ResolvedPath> {
    return pathname !== this.currentPage?.pathname
      ? await this.resolvePathname(pathname)
      : { mount() {}, unmount() {} }
  }

  private getPopped() {
    return this.navIndex < this.navStack.length - 1
      ? this.navStack.slice(this.navIndex + 1)
      : undefined
  }

  private onPop = () => {
    const poppedPage = this.navStack.pop()
    if (poppedPage) {
      this.onPageChange(undefined, [poppedPage])
    }
  }

  private onClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return
    }
    const anchor = closest<HTML.Anchor>(event.target, 'a')
    const href = anchor?.getAttribute('href')
    if (href) {
      this.navigate(href, event)
    }
  }

  /**
   * Handle a navigation event. If `event` is undefined, this is the initial
   * navigation.
   */
  protected async navigate(path: string, event?: Event): Promise<void> {
    event?.preventDefault()
    const pathname = this.getPathname(new URL(path, location.origin))
    const resolved = await this.maybeResolvePathname(pathname)
    const popped = this.getPopped()
    if (event) {
      this.navigateSync(path, resolved, ref(null))
    } else {
      const [session, , state = null] = history.state || []
      if (session) {
        // Reuse the old session timestamp so `history.forward` events can be
        // distinguished from `history.back` events.
        this.session = session
      }
      this.navigateSync(path, resolved, ref(state), true)
    }
    this.onPageChange(event, popped)
    this.onLocationChange?.()
  }

  protected navigateSync(
    path: string,
    resolved: ResolvedPath,
    state: Ref<any>,
    isInitial?: boolean
  ) {
    const time = Date.now()
    if (this.navIndex < this.navStack.length - 1) {
      this.navStack = this.navStack.slice(0, this.navIndex + 1)
    }
    const { session } = this
    this.navIndex++
    this.navStack.push({
      ...resolved,
      time,
      path,
      pathname: this.getPathname(new URL(path, location.origin)),
      state,
      session,
    })
    if (isInitial) {
      this.replaceState(path, time, state.peek())
    } else {
      this.pushState(path, time, state.peek())
    }
  }

  protected pushState(path: string, time: number, state?: any) {
    history.pushState(makePageRecord(this.session, time, state), '', path)
  }

  protected replaceState(path: string, time: number, state?: any) {
    history.replaceState(makePageRecord(this.session, time, state), '', path)
  }

  protected onPageChange(event?: Event, popped?: Page[]) {
    const page = this.currentPage
    if (page) {
      this.pathnameRef.value = page.pathname
      page.mount(event, popped)

      if (page.scrollTops) {
        requestAnimationFrame(() => {
          for (const [selector, scrollTop] of Object.entries(
            page.scrollTops!
          )) {
            const target = document.querySelector(selector)
            if (target) {
              target.scrollTop = scrollTop
            }
          }
        })
      }
    }
  }

  /**
   * Called on `popstate` and navigation events.
   */
  protected onLocationChange?(): void
}

export class HashRouter extends ClientRouter {
  protected override getPathname(location: URL | Location) {
    return location.hash.slice(1) || '/'
  }

  protected override getPath(pathname: string, _location: URL | Location) {
    return '#' + pathname
  }

  protected override async navigate(path: string, event?: MouseEvent) {
    if (path[0] === '#') {
      await super.navigate(path.slice(1), event)
    }
  }

  protected override pushState(path: string, time: number) {
    super.pushState('#' + path, time)
  }

  protected override replaceState(path: string, time: number, state?: any) {
    super.replaceState('#' + path, time, state)
  }
}

export interface PathRouterOptions extends ClientRouterOptions {
  handleHashClicks?: boolean
}

export class PathRouter extends ClientRouter<PathRouterOptions> {
  hashRef = ref(location.hash)

  get hash() {
    return this.hashRef.value
  }

  protected override getPathname(location: URL | Location) {
    return location.pathname
  }

  protected override getPath(pathname: string, location: URL | Location) {
    return pathname + location.search + location.hash
  }

  protected override async navigate(path: string, event?: MouseEvent) {
    if (path[0] === '/') {
      await super.navigate(path, event)
    } else if (this.options.handleHashClicks && path[0] === '#') {
      event?.preventDefault()

      if (path !== location.hash) {
        // Since hash links don't change the DOM, we don't need to mount or unmount them.
        const resolved: ResolvedPath = {
          mount() {},
          unmount() {},
        }

        const { state } = this.currentPage
        this.navigateSync(
          location.pathname + location.search + path,
          resolved,
          state
        )

        this.onLocationChange()
      }
    }
  }

  protected override onLocationChange() {
    this.hashRef.value = location.hash
  }
}

function makePageRecord(
  session: number,
  time: number,
  state: any,
  scrollTops?: Record<string, number>
): PageRecord {
  const record: PageRecord = [session, time]
  if (state != null) {
    record[2] = state
  }
  if (scrollTops != null) {
    record[3] = scrollTops
  }
  return record
}

function closest<Tag extends Element>(
  node: EventTarget | null,
  selector: string
) {
  while (isNode(node)) {
    if (isElement(node)) {
      return node.closest(selector) as Tag | null
    }
    node = node.parentNode
  }
  return null
}
