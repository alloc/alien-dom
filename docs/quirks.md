# Quirks

### Component guidelines

- **While rendering:** Avoid mutating state your component didn't create, as this could lead to unexpected behavior if your component (or one of its descendants) throws an error during render.

- **While rendering:** Properties of a JSX element are not guaranteed to be up-to-date. If you need to access a property of a JSX element, do so within an event handler or effect.

- Replacing or removing the root node of a component with native DOM methods will break component effects. You should rerender the component instead.

### JSX elements

- When a JSX element is created with a component tag, and it's nested within another JSX element also created with a component tag, the inner element will be wrapped with a thunk (to ensure top-down execution order). As a result, the element's props will be evaluated lazily.

- If a JSX element is referenced by a variable declared during render, subsequent renders will always reuse the same DOM element. This avoids issues with closures (i.e. effects and event listeners) ever having stale references to the DOM elements they need.

- If a JSX element has a `ref` prop, the ref prop is only set to the original DOM element (the one actually connected to a document).

- JSX elements cannot be referenced (by variable or `ref` prop) if declared within a loop or non-component function. Move the JSX element into a separate component that your loop or function renders instead.

### Component effects

- Effects are not guaranteed to run before the component's first paint.

- Effects are not guaranteed to run at all, if the component is re-rendered before the effect is triggered.
