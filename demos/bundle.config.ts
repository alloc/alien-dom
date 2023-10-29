import alienDOM from '@alien-dom/htmelt'
import preval from '@htmelt/preval'
import unocss from '@htmelt/unocss'
import { defineConfig } from 'htmelt/config.mjs'

export default defineConfig({
  build: './dist',
  plugins: [alienDOM(), preval(), unocss()],
})
