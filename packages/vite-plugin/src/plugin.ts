import type { SelfUpdatingPluginState } from '@alien-dom/nebu'
import { nebu } from 'nebu'
import * as tsconfck from 'tsconfck'
import * as vite from 'vite'

export default (): vite.Plugin => {
  let rootDir: string
  let nebuPlugins: any[]
  let selfUpdating: SelfUpdatingPluginState
  let tsConfigCache: Map<string, tsconfck.TSConfckParseResult>
  let tsConfigPaths: Set<string>

  async function loadJsxImportSource(id: string) {
    const tsConfigPath = await tsconfck.find(id, {
      root: rootDir,
      tsConfigPaths,
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

  return {
    name: 'vite-plugin-alien-dom',
    configResolved(config) {
      rootDir = config.root
      selfUpdating = {
        globalNextId: 0,
        ensureComponentNames: config.mode === 'development',
      }
    },
    async buildStart() {
      // TODO: hot module reloading
      const { nebuSelfUpdating } = await import('@alien-dom/nebu')
      nebuPlugins = [nebuSelfUpdating(selfUpdating)]

      // TODO: watch for tsconfig files in dev mode
      tsConfigCache = new Map()
      tsConfigPaths = new Set(
        await tsconfck.findAll(rootDir, {
          skip: dir => dir === 'node_modules' || dir === '.git',
        })
      )
    },
    async transform(code, id) {
      if (!/\.[jt]sx$/.test(id)) {
        return
      }
      if (id.includes('node_modules')) {
        return
      }
      const jsxImportSource = await loadJsxImportSource(id)
      if (jsxImportSource !== 'alien-dom') {
        return
      }
      const result = nebu.process(code, {
        filename: id,
        jsx: true,
        sourceMap: true,
        sourceMapHiRes: true,
        plugins: nebuPlugins,
      })
      return {
        code: result.js,
        map: result.map as any,
      }
    },
  }
}
