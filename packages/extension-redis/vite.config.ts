import { defineConfig } from 'vite-plus'
import { hocuspocusPackConfigs } from '../../pack.config.mjs'

export default defineConfig({
  pack: hocuspocusPackConfigs(),
})
