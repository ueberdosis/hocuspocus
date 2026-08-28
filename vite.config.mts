import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite-plus'

// Resolve workspace imports straight to their source, like the previous
// --conditions=source setup did for ava.
const packageAliases = Object.fromEntries(
  fs
    .readdirSync('./packages')
    .filter(dir => fs.existsSync(`./packages/${dir}/src/index.ts`))
    .map(dir => [`@hocuspocus/${dir}`, path.resolve(`./packages/${dir}/src/index.ts`)]),
)

export default defineConfig({
  resolve: {
    alias: packageAliases,
  },
  test: {
    include: ['tests/**/*.ts'],
    exclude: ['**/node_modules/**', 'tests/utils/**'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  staged: files => {
    const filteredFiles = files.filter(file => /\.(ts|tsx|js|jsx)$/.test(file))

    if (filteredFiles.length === 0) {
      return []
    }

    const fileList = filteredFiles.join(' ')

    return [`oxfmt ${fileList}`, `oxlint --fix --quiet --no-error-on-unmatched-pattern ${fileList}`]
  },
})
