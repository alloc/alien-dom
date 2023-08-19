/// <reference types="typings-esm-loader" />
import { nebuSelfUpdating } from '@alien-dom/nebu'
import * as fs from 'fs/promises'
import { nebu } from 'nebu'
import nodeResolve from 'resolve'
import * as sucrase from 'sucrase'
import * as tsconfck from 'tsconfck'

const tsRegex = /\.[mc]?ts$/
const jsxRegex = /\.(j|t)sx$/
const urlRegex = /^\w+:\/\//

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

  const specifier = urlRegex.test(url) ? new URL(url).pathname : url
  const fromDir = context.parentURL
    ? new URL('.', context.parentURL).pathname
    : process.cwd()

  const result = nodeResolve.sync(specifier, {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.cts', '.mts', '.cjs', '.mjs'],
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
      const { tsconfig } = await tsconfck.parse(filePath)
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
