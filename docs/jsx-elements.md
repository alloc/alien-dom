# JSX Elements

- an `HTMLElement` or `SVGElement` is returned synchronously
- must be added to the DOM as soon as possible
- not guaranteed to be up-to-date when accessed inside a component
  during render (but will be up-to-date within event handlers and hooks)
- can have its prop values evaluated lazily (if the element gets wrapped
  in a thunk)
