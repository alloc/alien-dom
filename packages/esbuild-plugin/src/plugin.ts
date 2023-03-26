import { Plugin } from 'esbuild'
import { getBuildExtensions } from 'esbuild-extra'
import nebuAlienDOM from '@alien-dom/nebu'
import { nebu } from 'nebu'

export default function esbuildAlienDOM() {
  const plugin: Plugin = {
    name: 'alien-dom',
    setup(build) {
      const { onTransform } = getBuildExtensions(build, plugin.name)
      const selfUpdatingRE = /\bselfUpdating\b[^}]*\} *from *['"]alien-dom['"]/

      onTransform({ loaders: ['jsx'] }, async args => {
        if (selfUpdatingRE.test(args.code)) {
          const result = nebu.process(args.code, {
            filename: args.path,
            jsx: true,
            sourceMap: true,
            sourceMapHiRes: true,
            plugins: [nebuAlienDOM],
          })
          return {
            code: result.js,
            map: result.map as any,
          }
        }
      })
    },
  }
  return plugin
}
