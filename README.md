# alien-dom

Component engine that feels like React but has…

- Transparent observables (implicit reactivity, _components are observers_)
  - No need to explicitly wrap your components (see MobX)
  - No need for weird `foo()` access patterns (see Solid.js)
  - Host elements (i.e. `div`) accept observable refs as props!
- Synchronous top-down JSX evaluation (requires a compile step)
  - …so stack traces aren't useless!
  - …and you get DOM elements immediately! (no virtual DOM, thanks to `morphdom`)
- Automatically memoized functions and inline objects
- Automatic disposal of effects and event listeners (write less manual cleanup in `useEffect` destructors)
- Strongly typed event channels (see `defineChannel`)
- Nested components just work ™️
- Built-in niceties
  - Flexible `class` prop (supports arrays and objects)
  - Light-weight spring animations
  - Light-weight observability engine
  - jQuery-inspired DOM extensions (optional)
  - A standard library of component hooks (tree-shakeable)
  - Easy context forwarding

### How exactly does it "feel like React?"

The look and feel of React is preserved, including:

- Plain function components (but no component classes)
- Good ol' JSX (i.e. `<div class="foo" key={index} />`) albeit with different evaluation semantics
- Component hooks with similar names (i.e. `useEffect`, `useMemo`, `useRef`, `useState`) albeit with different behavior (except for useEffect)
- The rules of React hooks apply to Alien DOM hooks (i.e. hooks must be called at the top level of a component) but event listeners can be attached anywhere

### Are there missing features?

As this library is in beta, there are drawbacks compared to React:

- No error boundaries (yet)
- No suspense (yet)
- No server-side rendering (yet)
- No plugin for Vite (yet)
- No concurrent mode (probably never)

### I'm ready to learn more!

- See the [Getting Started](docs/getting-started.md) page for a quick introduction.
- See the [Quirks](docs/quirks.md) page for things to keep in mind.

### Credits

These libraries contribute a ton to Alien DOM's functionality:

- we forked the awesome [jsx-dom](https://github.com/alex-kinokon/jsx-dom) package
- we forked the sublime [morphdom](https://github.com/patrick-steele-idem/morphdom) package
