import path from 'path'
import { defineConfig } from 'vite'
import Pages from 'vite-plugin-pages'
import { createVuePlugin } from 'vite-plugin-vue2'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    createVuePlugin(),
    Pages(),
  ],
  resolve: {
    alias: [
      {
        find: '@hocuspocus/provider',
        replacement: path.resolve(__dirname, '../../packages/provider/src/index.ts'),
      },
      {
        find: '@hocuspocus/common',
        replacement: path.resolve(__dirname, '../../packages/common/src/index.ts'),
      },
    ],
  },
})
