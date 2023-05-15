# Function Components

## Self-updating ancestors

Even if a plain function component isn't explicitly wrapped with a
`selfUpdating` call, it can still become a self-updating component at
runtime. Specifically, if it has a self-updating ancestor, it will also
become self-updating.

Note that elements created outside (i.e. in a `useEffect` callback or
other callback) of a self-updating component's render phase do **NOT**
have their component forced into self-updating mode.

In practice, when a plain component becomes a self-updating component,
the only major side effect is in relation to JSX element references (see
below).

## Element references

By declaring a JSX element anywhere other than a `return` statement or
within a JSX parent element, you've created an element reference.

In a self-updating component (explicit or otherwise), this means the DOM
element returned by the JSX declaration could be an element reused from
a previous render.

### Limitations

If your component or non-component function is never used within a
self-updating component tree, these limitations don't apply.

- JSX element references cannot exist in a loop. Move the reference into
  a separate component that your loop renders instead.

- JSX element references cannot be used in non-component functions. Move
  the reference into a separate component that your function renders
  instead.

### When are elements updated?

A referenced element won't be updated with the latest props until the
component returns (unless the element was just created). This means any
attributes or properties you access during render aren't guaranteed to
be up-to-date.
