import { MemoizerPluginState, nebuHMR, nebuMemoizer } from '@alien-dom/nebu'
import { Plugin } from 'esbuild'
import { getBuildExtensions } from 'esbuild-extra'
import { nebu } from 'nebu'
import { relative } from 'path'

export type {
  MemoizerPluginOptions,
  MemoizerPluginState,
} from '@alien-dom/nebu'

export default function esbuildAlienDOM(
  options: {
    dev?: boolean
    /** By default, enabled when `dev` is true. */
    hmr?: boolean
    onHmrAdded?: (file: string) => void
    /** Internal state for the `nebuSelfUpdating` plugin. */
    memoizerState?: MemoizerPluginState
  } = {}
) {
  const plugin: Plugin = {
    name: 'alien-dom',
    setup(build) {
      // Instantiate the plugins once per build, since some project-wide
      // state is relied on.
      const plugins = [
        (options.hmr ?? options.dev) &&
          nebuHMR({
            onHmrAdded: options.onHmrAdded,
          }),
        nebuMemoizer(options.memoizerState, {
          dev: options.dev,
        }),
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
