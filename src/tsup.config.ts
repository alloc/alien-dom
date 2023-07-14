import { copyFileSync, mkdirSync } from 'fs'
import { defineConfig } from 'tsup'

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
    copyLicense('jsx-dom')
    copyLicense('morphdom')
  },
})

function copyLicense(fromDir: string) {
  try {
    mkdirSync('../dist/' + fromDir)
  } catch {}
  copyFileSync(fromDir + '/LICENSE', '../dist/' + fromDir + '/LICENSE')
}
