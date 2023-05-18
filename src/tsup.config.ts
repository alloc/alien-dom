import { defineConfig } from 'tsup'
import { copyFileSync } from 'fs'

export default defineConfig({
  entry: [
    'index.ts',
    'element.ts',
    'animate.ts',
    'hmr.ts',
    'helpers.ts',
    'internal/element.ts',
    'internal/nodeList.ts',
    'morphdom/index.ts',
    'jsx-dom/jsx-runtime.ts',
    'jsx-dom/shadow.ts',
    'types/index.ts',
  ],
  outDir: '../dist',
  format: ['esm'],
  dts: true,
  noExternal: ['linear-color', '@alloc/types', '@alloc/is'],
  async onSuccess() {
    copyFileSync('jsx-dom/LICENSE', '../dist/jsx-dom/LICENSE')
    copyFileSync('morphdom/LICENSE', '../dist/morphdom/LICENSE')
  },
})
