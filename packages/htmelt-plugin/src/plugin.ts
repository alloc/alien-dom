import esbuildAlienDom, { SelfUpdatingPluginState } from '@alien-dom/esbuild'
import { md5Hex, Plugin } from '@htmelt/plugin'
import path from 'path'

export default (): Plugin => (config, flags) => {
  if (!flags.watch) {
    config.esbuild.plugins.push(esbuildAlienDom())
    return {}
  }

  const selfUpdating: SelfUpdatingPluginState = {
    globalNextId: 0,
    ensureComponentNames: config.mode === 'development',
  }

  const acceptableModules = new Set<string>()
  const acceptedModules = new Set<string>()

  config.esbuild.plugins.push(
    esbuildAlienDom({
      selfUpdating,
      hmrHash: md5Hex,
      onHmrAdded(file) {
        acceptableModules.add(file)
      },
    })
  )

  const recentlyServedModules = new Map<
    string,
    Promise<Plugin.VirtualFileData>
  >()

  const serveModule = async (entry: string) => {
    return {
      data: await config.loadDevModule(entry),
      headers: {
        'content-type': 'application/javascript',
      },
    }
  }

  return {
    fullReload() {
      // Reset the globalNextId only on full reload, so hot-reloaded
      // modules don't cause key collisions.
      selfUpdating.globalNextId = 0

      acceptableModules.clear()
      acceptedModules.clear()
    },
    async serve(req) {
      let result = recentlyServedModules.get(req.pathname)
      if (result) {
        return result
      }
      if (acceptedModules.has(req.pathname)) {
        acceptedModules.delete(req.pathname)

        result = serveModule(path.resolve(req.pathname.slice(1)))

        recentlyServedModules.set(req.pathname, result)
        setTimeout(() => {
          recentlyServedModules.delete(req.pathname)
        }, 1000)

        return result
      }
    },
    hmr: clients => ({
      accept(file) {
        if (acceptableModules.has(file)) {
          acceptableModules.delete(file)
          acceptedModules.add(file)
          return true
        }
      },
      async update(files) {
        const clientUpdaterPath = path.resolve(__dirname, 'client.js')
        await Promise.all(
          Array.from(clients, client =>
            client.evaluateModule(clientUpdaterPath, [files])
          )
        )
      },
    }),
  }
}
