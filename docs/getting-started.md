# Getting Started

```
npm install alien-dom
pnpm install alien-dom
yarn add alien-dom
```

## 1. Add the esbuild plugin

```
npm install @alien-dom/esbuild
```

## 2. Create your first component

```tsx
function Hello() {
  return <div>Hello world</div>
}

document.body.append(<Hello />)
```

## 3. Learn the different Hooks

Hooks can only be used in components or in custom Hooks. Don’t call Hooks inside loops, conditions, or nested functions. Instead, always use Hooks at the top level of your component, before any early returns.

### useState

Runs a given callback once and returns the result. Any extra arguments to `useState` are forwarded to the callback.

### useEffect

Runs a given callback whenever the dependency array has a different set of values in a subsequent render. The callback can return a destructor, which is called to clean up any side-effects.

### useMemo

Runs a given callback whenever the dependency array has a different set of values in a subsequent render. The callback's return value is memoized and returned.

### useRef

Creates a `Ref` object that can be observed when its `value` property changes. You may pass an initial value, but a function argument will be called and its result will be used as the initial value instead.

---

There are many more hooks, but they are not as commonly used. I will be documenting them soon.

_TODO: finish this page_
