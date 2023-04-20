import { defineConfig } from 'tsup'
import { copyFileSync } from 'fs'

export default defineConfig({
  entry: [
    'index.ts',
    'element.ts',
    'nodeList.ts',
    'animate.ts',
    'hmr.ts',
    'morphdom/index.ts',
    'jsx-dom/jsx-runtime.ts',
    'jsx-dom/shadow.ts',
    'types/index.ts',
  ],
  outDir: '../dist',
  format: ['esm'],
  dts: true,
  treeshake: 'smallest',
  noExternal: ['linear-color', '@alloc/types'],
  async onSuccess() {
    copyFileSync('jsx-dom/LICENSE', '../dist/jsx-dom/LICENSE')
    copyFileSync('morphdom/LICENSE', '../dist/morphdom/LICENSE')
  },
})
