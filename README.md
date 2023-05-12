# alien-dom

Choosing a rendering library is all about trade-offs. This library
started as an exploration of an idea to give `jsx-dom` a reactive
component engine (powered by `morphdom` and `@preact/signals`). To make
this happen, it does a few simple AST transformations on your JSX code.
The result is a library that feels like React, but with a few extra
features and a few less trade-offs.

### Features

- **Intuitive JSX**
  - what if JSX gave you a DOM element? (goodbye refs)
  - what if the `class` prop could be an array/object and skipped falsy values? (goodbye `classnames` library import)
  - what if arrays of JSX children did not require an explicit `key` prop? (goodbye missing `key` warnings)
- **Super-powered Components**
  - what if components were integrated with Preact signals for transparent reactivity? (goodbye expensive re-renders)
  - what if reactive components still felt like React components? (goodbye Solid.js paradigm shift)
  - what if component stack traces weren't useless? (goodbye asynchronous component evaluation)
  - what if stateless component effects were automatically cleaned up? (goodbye manual cleanup)
  - what if callback props and inline objects were automatically memoized? (goodbye useCallback/useMemo/React.memo hell)
  - what if there were more useful (but optional) hooks baked in? (goodbye fragmented ecosystem)
- **Vanilla JS but better**
  - what if DOM elements were optionally extended with jQuery-inspired methods? (goodbye awkward DOM manipulation)
  - what if spring animations were baked in? (goodbye awkward third-party animation libraries)
  - what if optional micro-libraries for common use cases were baked in? (goodbye fragmented ecosystem)

### Docs

(Very work in progress)

- [Function components](./docs/function-components.md)
- [Element extensions](./docs/element-extensions.md)
- [Spring animations](./docs/spring-animations.md)

### Credits

These libraries contribute a ton to Alien DOM's functionality:

- we fork the awesome [jsx-dom](https://github.com/alex-kinokon/jsx-dom) package
- we fork the sublime [morphdom](https://github.com/patrick-steele-idem/morphdom) package
- we use the magnificent [@preact/signals-core](https://www.npmjs.com/package/@preact/signals-core) package
