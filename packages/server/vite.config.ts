import { defineConfig } from 'vite-plus'
import { hocuspocusPackConfigs } from '../../pack.config.mjs'

export default defineConfig({
  // crossws is ESM-only; inline it into the CJS bundle so consumers on
  // CJS-only loaders (Jest 29, ts-node) can require() the server.
  pack: hocuspocusPackConfigs(['crossws']),
})
