import { Plugin } from 'esbuild'
import { getBuildExtensions } from 'esbuild-extra'
import { nebuSelfUpdating, nebuHMR } from '@alien-dom/nebu'
import { nebu } from 'nebu'
import { relative } from 'path'

export default function esbuildAlienDOM(
  options: {
    /** Define this to enable hot module reloading. */
    hmrHash?: (code: string) => string
    onHmrAdded?: (file: string) => void
    /** Internal state for the `nebuSelfUpdating` plugin. */
    selfUpdating?: {
      globalNextId: number
    }
  } = {}
) {
  const plugin: Plugin = {
    name: 'alien-dom',
    setup(build) {
      // Instantiate the plugins once per build, since some project-wide
      // state is relied on.
      const plugins = [
        options.hmrHash &&
          nebuHMR({
            hash: options.hmrHash,
            onHmrAdded: options.onHmrAdded,
          }),
        nebuSelfUpdating(options.selfUpdating),
      ]

      const { onTransform } = getBuildExtensions(build, plugin.name)
      onTransform({ loaders: ['jsx'] }, async args => {
        const result = nebu.process(args.code, {
          filename: args.path,
          jsx: true,
          sourceMap: true,
          sourceMapHiRes: true,
          plugins,
          state: {
            file: '/' + relative(process.cwd(), args.initialPath || args.path),
            code: args.code,
          },
        })
        return {
          code: result.js,
          map: result.map as any,
        }
      })
    },
  }
  return plugin
}
