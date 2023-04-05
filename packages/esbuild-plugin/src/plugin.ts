import { Plugin } from 'esbuild'
import { getBuildExtensions } from 'esbuild-extra'
import { nebuSelfUpdating, nebuTopDownThunks } from '@alien-dom/nebu'
import { nebu } from 'nebu'

export default function esbuildAlienDOM() {
  const plugin: Plugin = {
    name: 'alien-dom',
    setup(build) {
      // Instantiate the plugins once per build, since some project-wide
      // state is relied on.
      const plugins = [nebuSelfUpdating(), nebuTopDownThunks]

      const { onTransform } = getBuildExtensions(build, plugin.name)
      onTransform({ loaders: ['jsx'] }, async args => {
        const result = nebu.process(args.code, {
          filename: args.path,
          jsx: true,
          sourceMap: true,
          sourceMapHiRes: true,
          plugins,
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
