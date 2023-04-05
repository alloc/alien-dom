# Function Components

### Element references

JSX-defined elements can be referenced with a variable, with some limitations.

- JSX element references cannot exist in a loop. Move the reference into
  a separate component that your loop renders instead.

- JSX element references cannot be used in non-component functions. Move
  the reference into a separate component that your function renders
  instead.

The limitations above only apply if your component is ever rendered by a
self-updating component (directly or indirectly) or is itself a
self-updating component.

It's also important to understand that a JSX element isn't guaranteed to
have up-to-date property values during render.
