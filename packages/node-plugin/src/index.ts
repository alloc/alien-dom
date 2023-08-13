/// <reference types="typings-esm-loader" />
import { nebuSelfUpdating } from '@alien-dom/nebu'
import { nebu } from 'nebu'
import * as sucrase from 'sucrase'

const extensionsRegex = /\.(j|t)sx$/

export const load: load = async (url, context, nextLoad) => {
  if (extensionsRegex.test(url)) {
    let code = (await nextLoad(url, context)).source.toString()

    const file = new URL(url).pathname
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

  return nextLoad(url, context)
}
