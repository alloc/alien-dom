import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'index.ts',
    'element.ts',
    'nodeList.ts',
    'animate.ts',
    'jsx-dom/jsx-runtime.ts',
    'jsx-dom/shadow.ts',
    'types/index.ts',
    'internal/types.ts',
  ],
  outDir: '../dist',
  format: ['esm'],
  dts: true,
  noExternal: ['linear-color', '@alloc/types'],
})
