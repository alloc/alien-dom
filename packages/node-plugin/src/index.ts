/// <reference types="typings-esm-loader" />
import { nebuSelfUpdating } from '@alien-dom/nebu'
import * as fs from 'fs/promises'
import { nebu } from 'nebu'
import * as path from 'path'
import nodeResolve from 'resolve'
import * as sucrase from 'sucrase'
import * as tsconfck from 'tsconfck'
import { createMatchPath } from 'tsconfig-paths'

const tsRegex = /\.[mc]?ts$/
const jsxRegex = /\.(j|t)sx$/
const urlRegex = /^\w+:\/\//

const extensions = '.js .jsx .ts .tsx .cts .mts .cjs .mjs'.split(' ')

const tsconfckOptions: tsconfck.TSConfckParseOptions = {
  cache: new Map(),
}

export const resolve: resolve = async (url, context, nextResolve) => {
  try {
    return await nextResolve(url, context)
  } catch (error: any) {
    if (
      error.code !== 'ERR_MODULE_NOT_FOUND' &&
      error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED' &&
      error.code !== 'ERR_UNSUPPORTED_DIR_IMPORT'
    ) {
      throw error
    }
  }

  let specifier = urlRegex.test(url) ? new URL(url).pathname : url

  const fromDir = context.parentURL
    ? new URL('.', context.parentURL).pathname
    : process.cwd()

  let baseUrl: string | undefined
  let paths: Record<string, string[]> | undefined
  try {
    const { tsconfig, tsconfigFile } = await tsconfck.parse(
      context.parentURL
        ? new URL(context.parentURL).pathname
        : path.resolve('index.ts'),
      tsconfckOptions
    )
    // One of (or both of) `paths` and `baseUrl` must exist.
    paths = tsconfig.compilerOptions.paths
    baseUrl =
      tsconfig.compilerOptions.baseUrl ?? (paths && path.dirname(tsconfigFile))
    paths ??= baseUrl ? {} : undefined
  } catch {}

  if (baseUrl && paths) {
    const matchPath = createMatchPath(baseUrl, paths)
    const mapping = matchPath(specifier, undefined, undefined, extensions)
    if (mapping) {
      specifier = mapping
    }
  }

  const result = nodeResolve.sync(specifier, {
    extensions,
    basedir: fromDir,
    preserveSymlinks: false,
  })

  return {
    url: 'file://' + result,
  }
}

export const load: load = async (url, context, nextLoad) => {
  const isTS = tsRegex.test(url)
  const isJSX = !isTS && jsxRegex.test(url)

  let filePath: string
  let code: string

  if (isTS || isJSX) {
    filePath = new URL(url).pathname
    try {
      code = (await nextLoad(url, context)).source.toString()
    } catch {
      code = await fs.readFile(filePath, 'utf8')
    }
  } else {
    return nextLoad(url, context)
  }

  let jsxRuntime: any
  let jsxImportSource: string | undefined

  if (isJSX) {
    if (filePath.endsWith('.tsx')) {
      const result = sucrase.transform(code, {
        transforms: ['typescript', 'jsx'],
        disableESTransforms: true,
        jsxRuntime: 'preserve',
        filePath,
      })

      code = result.code
    }

    const nebuResult = nebu.process(code, {
      plugins: [
        nebuSelfUpdating({
          globalNextId: 0,
          helpersId: 'alien-dom/helpers.ts',
        }),
      ],
      jsx: true,
      sourceMap: 'inline',
      sourceMapHiRes: true,
      filename: filePath,
    })

    code = nebuResult.js

    try {
      const { tsconfig } = await tsconfck.parse(filePath, tsconfckOptions)
      jsxRuntime = tsconfig.compilerOptions.jsx
      jsxImportSource = tsconfig.compilerOptions.jsxImportSource
      if (jsxRuntime === 'react-jsx' || jsxRuntime === 'react-jsxdev') {
        jsxRuntime = 'automatic'
      } else if (jsxRuntime === 'react') {
        jsxRuntime = 'classic'
      }
    } catch {}

    const result = sucrase.transform(code, {
      transforms: ['jsx'],
      disableESTransforms: true,
      filePath,
      jsxRuntime,
      jsxImportSource,
      production: process.env.NODE_ENV !== 'development',
    })

    code = result.code
  } else {
    const result = sucrase.transform(code, {
      transforms: ['typescript'],
      disableESTransforms: true,
      filePath,
    })

    code = result.code
  }

  return {
    format: 'module',
    source: code,
  }
}
