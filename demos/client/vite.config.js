import { defineConfig } from 'vite'
import { createVuePlugin } from 'vite-plugin-vue2'

// https://vitejs.dev/config/
// https://github.com/underfin/vite-plugin-vue2
export default defineConfig({
  plugins: [createVuePlugin()],
})
