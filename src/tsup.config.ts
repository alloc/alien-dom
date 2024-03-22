/// <reference path="../node_modules/@types/node/index.d.ts" />
import dedent from 'dedent'
import glob from 'fast-glob'
import { copyFileSync, mkdirSync, writeFileSync } from 'fs'
import { Options, defineConfig } from 'tsup'

const entryPaths = glob
  .sync('*.ts', { ignore: ['*.config.ts', '*.d.ts'] })
  .sort(sortEntryPaths)

const commonOptions: Options = {
  entry: [...entryPaths, 'jsx-dom/jsx-runtime.ts'],
  format: ['esm'],
  noExternal: ['linear-color', '@alloc/types', '@alloc/is'],
}

const productionBuild: Options = {
  ...commonOptions,
  outDir: '../dist/production',
  dts: process.env.npm_lifecycle_event === 'build',
  define: {
    DEV: 'false',
  },
  async onSuccess() {
    writePackageJson()
    writeLegacyEntryPoints()
    writeJSXRuntime()
    copyLicense('jsx-dom')
    copyLicense('morphdom')
  },
}

const developmentBuild: Options = {
  ...commonOptions,
  outDir: '../dist/development',
  define: {
    DEV: 'true',
  },
}

export default defineConfig([productionBuild, developmentBuild])

function writePackageJson() {
  const pkg = require('../package.json')
  delete pkg.ava
  delete pkg.devDependencies
  delete pkg.prettier
  delete pkg.private
  delete pkg.scripts

  pkg.exports = Object.fromEntries([
    ...entryPaths.map(srcPath => {
      const outPath = ('./' + srcPath)
        .replace(/\.ts$/, '')
        .replace(/\/index$/, '')

      const importPath = srcPath.replace(/\.ts$/, '.mjs')
      const typesPath = srcPath.replace(/\.ts$/, '.d.ts')

      const exports = {
        types: './production/' + typesPath,
        import: {
          development: './development/' + importPath,
          default: './production/' + importPath,
        },
      }

      return [outPath, exports] as const
    }),
    ...['jsx-runtime.js', 'jsx-dev-runtime.js'].map(importPath => {
      const outPath = './' + importPath.replace(/\.js$/, '')
      const exports = {
        types: './' + importPath.replace(/-dev/, '').replace(/\.js$/, '.d.ts'),
        import: importPath.includes('dev')
          ? './' + importPath
          : {
              development: './jsx-dev-runtime.js',
              default: './jsx-runtime.js',
            },
      }

      return [outPath, exports]
    }),
  ])

  writeFileSync('../dist/package.json', JSON.stringify(pkg, null, 2))
}

function sortEntryPaths(a: string, b: string) {
  return a === 'index.ts' ? -1 : b === 'index.ts' ? 1 : a.localeCompare(b)
}

function writeLegacyEntryPoints() {
  for (const srcPath of entryPaths) {
    if (srcPath === 'index.ts') continue
    const outPath = srcPath.replace(/\.ts$/, '')
    writeFileSync(
      '../dist/' + outPath + '.mjs',
      `export * from './production/${outPath}'`
    )
    writeFileSync(
      '../dist/' + outPath + '.d.ts',
      `export * from './production/${outPath}'`
    )
  }
}

function writeJSXRuntime() {
  writeFileSync(
    '../dist/jsx-dev-runtime.js',
    `export { Fragment, jsx, jsx as jsxDEV, jsxs } from './development/jsx-dom/jsx-runtime.mjs'`
  )
  writeFileSync(
    '../dist/jsx-runtime.js',
    `export { Fragment, jsx, jsx as jsxDEV, jsxs } from './production/jsx-dom/jsx-runtime.mjs'`
  )
  writeFileSync(
    '../dist/jsx-runtime.d.ts',
    dedent`
      export { Fragment, jsx, jsx as jsxDEV, jsxs } from './production/jsx-dom/jsx-runtime'
      export { JSX } from './production/index'
    `
  )
}

function copyLicense(fromDir: string) {
  const file = fromDir + '/LICENSE'

  mkdirSync('../dist/production/' + fromDir, { recursive: true })
  copyFileSync(file, '../dist/production/' + file)
}
