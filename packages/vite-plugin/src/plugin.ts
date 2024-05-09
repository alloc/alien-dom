import type { SelfUpdatingPluginState } from '@alien-dom/nebu'
import md5Hex from 'md5-hex'
import { nebu } from 'nebu'
import * as tsconfck from 'tsconfck'
import { TSConfckCache, TSConfckParseResult } from 'tsconfck'
import * as vite from 'vite'

export default (): vite.Plugin[] => {
  let rootDir: string
  let nebuPlugins: any[]
  let selfUpdating: SelfUpdatingPluginState
  let tsConfigCache: TSConfckCache<TSConfckParseResult>

  async function loadJsxImportSource(id: string) {
    const tsConfigPath = await tsconfck.find(id, {
      root: rootDir,
      cache: tsConfigCache,
    })
    if (!tsConfigPath) {
      return
    }
    const tsConfigResult = await tsconfck.parse(tsConfigPath, {
      cache: tsConfigCache,
    })
    const tsConfig = tsConfigResult.tsconfig as {
      compilerOptions: {
        jsxImportSource: string
      }
    }
    return tsConfig.compilerOptions.jsxImportSource
  }

  const isAlienDomFile = (id: string) => {
    // Virtual files not yet supported.
    return /\.[jt]sx$/.test(id) && !id.includes('\0')
  }

  const mainPlugin: vite.Plugin = {
    name: 'alien-dom',
    configResolved(config) {
      rootDir = config.root
      selfUpdating = {
        globalNextId: 0,
        ensureComponentNames: config.mode === 'development',
      }
    },
    async buildStart() {
      const { nebuSelfUpdating, nebuHMR } = await import('@alien-dom/nebu')
      nebuPlugins = [
        nebuSelfUpdating(selfUpdating),
        nebuHMR({
          hash: md5Hex,
          append: 'import.meta.hot.accept()',
        }),
      ]

      // TODO: watch for tsconfig files in dev mode
      tsConfigCache = new TSConfckCache()
    },
    transform: {
      order: 'pre',
      handler: async (code, id) => {
        if (!isAlienDomFile(id)) {
          return
        }
        const jsxImportSource = await loadJsxImportSource(id)
        if (jsxImportSource !== 'alien-dom') {
          return
        }
        // Remove any TypeScript syntax but preserve JSX.
        if (id.endsWith('.tsx')) {
          const transformed = await vite.transformWithEsbuild(code, id, {
            jsx: 'preserve',
            loader: 'tsx',
          })
          return {
            code: transformed.code,
            map: transformed.map,
            meta: { alienDom: true },
          }
        }
        return {
          meta: { alienDom: true },
        }
      },
    },
  }

  const jsxPlugin: vite.Plugin = {
    name: 'alien-dom/jsx',
    transform: {
      order: 'pre',
      async handler(code, id) {
        if (!isAlienDomFile(id)) {
          return
        }
        const moduleInfo = this.getModuleInfo(id)
        if (!moduleInfo || !moduleInfo.meta.alienDom) {
          return
        }
        const result = nebu.process(code, {
          filename: id,
          jsx: true,
          sourceMap: true,
          sourceMapHiRes: true,
          plugins: nebuPlugins,
          state: {
            file: id,
            code,
          },
        })
        return {
          code: result.js,
          map: result.map as any,
        }
      },
    },
  }

  return [mainPlugin, jsxPlugin]
}
