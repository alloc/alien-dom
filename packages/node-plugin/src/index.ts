/// <reference types="typings-esm-loader" />
import { nebuSelfUpdating } from '@alien-dom/nebu'
import { nebu } from 'nebu'
import * as sucrase from 'sucrase'

const tsRegex = /\.[mc]?ts$/
const jsxRegex = /\.(j|t)sx$/

export const load: load = async (url, context, nextLoad) => {
  const isTS = tsRegex.test(url)
  const isJSX = !isTS && jsxRegex.test(url)

  let code: string
  if (isTS || isJSX) {
    code = (await nextLoad(url, context)).source.toString()
  } else {
    return nextLoad(url, context)
  }

  const file = new URL(url).pathname

  if (isJSX) {
    if (file.endsWith('.tsx')) {
      const result = sucrase.transform(code, {
        transforms: ['typescript', 'jsx'],
        disableESTransforms: true,
        jsxRuntime: 'preserve',
        filePath: file,
      })

      code = result.code
    }

    const result = nebu.process(code, {
      plugins: [nebuSelfUpdating()],
      jsx: true,
      sourceMap: 'inline',
      sourceMapHiRes: true,
      filename: url.startsWith('file:') ? file : url,
    })

    return {
      format: 'module',
      source: result.js,
    }
  }

  const result = sucrase.transform(code, {
    transforms: ['typescript'],
    disableESTransforms: true,
    jsxRuntime: 'preserve',
    filePath: file,
  })

  return {
    format: 'module',
    source: result.code,
  }
}
