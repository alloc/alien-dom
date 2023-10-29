import { defineConfig } from '@htmelt/unocss'
import alloc, { Theme } from 'unocss-preset-alloc'

export default defineConfig<Theme>({
  include: ['**/src/**/*.{tsx,jsx,html}'],
  exclude: ['**/*.css'],
  presets: [alloc()],
  shortcuts: {
    cover: 'w-full h-full top-0 left-0',
    'both-center': 'items-center justify-center',
    'input-base':
      'text-26 tracking--0.008em border-1.5px border-gray300 focus:border-blue rounded-0.4 p-0.2 py-0.1 placeholder:color-gray400',
  },
})
