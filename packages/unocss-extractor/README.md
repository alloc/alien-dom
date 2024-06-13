# @alien-dom/unocss-extractor

A custom extractor for UnoCSS created to avoid false positives in `alien-dom` projects (specifically, their JSX and TSX modules).

## Install

```sh
pnpm install @alien-dom/unocss-extractor -D
```

## Usage

In your `unocss.config.ts` module, import the custom extractor and use it in your configuration.

```typescript
import { defineConfig } from '@unocss/vite'
import extractorDefault from '@alien-dom/unocss-extractor'

export default defineConfig({
  extractorDefault,
})
```

## How It Works

The extractor uses [`meriyah`](https://github.com/meriyah/meriyah) to quickly parse the abstract syntax tree (AST) of your JSX and TSX files. Since it doesn't support TypeScript, we must first strip the TypeScript syntax using [`sucrase`](https://github.com/alangpierce/sucrase).

Any files that aren't JSX or TSX will use the default extractor provided by UnoCSS.

Otherwise, the following rules are applied:

1. All string literals (except those within a skipped AST node) are split into tokens using UnoCSS's default tokenizer.
2. Property names of object literals within a "class-like" JSX attribute are added as tokens. This allows for the `{ flex: true }` syntax to be recognized by UnoCSS.
3. String literals inside **conditions** are skipped.
4. String literals inside `key` and "style-like" **JSX attribute values** are skipped.

### Class-Like JSX Attributes

A class-like attribute is one that is either named `class` exactly or ends with `Class` (e.g. `containerClass`).

Similarly, style-like attributes are those that are named `style` exactly or end with `Style` (e.g. `containerStyle`). These style-like attributes are ignored, so false positives are avoided.
