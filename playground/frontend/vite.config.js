import { defineConfig } from 'vite'
import Pages from 'vite-plugin-pages'
import { createVuePlugin } from 'vite-plugin-vue2'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    createVuePlugin(),
    Pages(),
  ],
})
