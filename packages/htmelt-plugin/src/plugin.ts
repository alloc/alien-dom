import esbuildAlienDom from '@alien-dom/esbuild'
import { md5Hex, Plugin } from '@htmelt/plugin'
import path from 'path'

export default (): Plugin => (config, flags) => {
  if (!flags.watch) {
    config.esbuild.plugins.push(esbuildAlienDom())
    return {}
  }

  const selfUpdating = { globalNextId: 0 }
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

  return {
    fullReload() {
      // Reset the globalNextId only on full reload, so hot-reloaded
      // modules don't cause key collisions.
      selfUpdating.globalNextId = 0

      acceptableModules.clear()
      acceptedModules.clear()
    },
    async serve(req) {
      if (acceptedModules.has(req.pathname)) {
        acceptedModules.delete(req.pathname)
        const entry = path.resolve(req.pathname.slice(1))
        return {
          data: await config.loadDevModule(entry),
          headers: {
            'content-type': 'application/javascript',
          },
        }
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
