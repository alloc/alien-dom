# Quirks

### Component guidelines

- **While rendering:** Avoid mutating state your component didn't create, as this could lead to unexpected behavior if your component (or one of its descendants) throws an error during render.

- **While rendering:** Properties of a JSX element are not guaranteed to be up-to-date. If you need to access a property of a JSX element, do so within an event handler or effect.

- **While rendering:** Never use native DOM methods to alter the `childNodes` array of a JSX element.

- Never use native DOM methods to alter the `childNodes` array of a JSX fragment.

- Replacing or removing the root node of a component with native DOM methods will break component effects. You should rerender the component instead.

- If an array of JSX elements doesn't have a stable order, you should use a `key` prop to help the renderer identify which elements have been added, removed, or moved. Alternatively, you can render a list of elements outside the render phase, so you're in control of updating it.

- For functions declared in components, avoid referencing variables declared after them or you might see stale values. Instead, declare the function after the variables it references. This guideline doesn't apply to functions nested in non-component functions.

### JSX elements

- If a JSX element is created outside a render pass, you must remove it from the DOM with an `unmount(node)` call. Otherwise, any persistent effects will leak memory. Of course, if you plan to reuse the element, you can safely remove it with `node.remove()` and reinsert it later.

- When a JSX element is created with a component tag, and it's nested within another JSX element also created with a component tag, the inner element will be wrapped with a thunk (to ensure top-down execution order). As a result, the element's props will be evaluated lazily.

- If a JSX element is referenced by a variable declared during render, subsequent renders will always reuse the same DOM element. This avoids issues with closures (i.e. effects and event listeners) ever having stale references to the DOM elements they need.

- If a JSX element has a `ref` prop, the ref prop is only set to the original DOM element (the one actually connected to a document). When an element ref's `setElement` method is called, the DOM element is **not** guaranteed to be connected to a document yet.

- JSX elements cannot be referenced (by variable or `ref` prop) if declared within a loop or non-component function. Move the JSX element into a separate component that your loop or function renders instead.

### Component effects

- Effects are not guaranteed to run before the component's first paint.

- Effects are not guaranteed to run at all, if the component is re-rendered before the effect is triggered.

### Observable prop values

- Nested refs have limited support. If the prop's value is a ref, it cannot have nested refs. For
  the `class` and `style` props, nested refs are allowed (unless the prop's value is a ref). For example, if `class` is an array of two refs, you're good. But if `class` is a ref containing an array of two refs, you're not good.
