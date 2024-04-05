# @alien-dom/node

Hook into the Node.js module loader to compile `alien-dom` components and JSX elements on-the-fly.

Useful for test runners like [AVA](https://github.com/avajs/ava).

```sh
node --loader @alien-dom/node [...]
```

### Usage with AVA

Test your components with the AVA test runner.

```sh
NODE_OPTIONS="--loader @alien-dom/node" ava --watch
```

In your package.json, make sure you have this AVA configuration:

```json
{
  "ava": {
    "extensions": {
      "tsx": "module"
    }
  }
}
```
