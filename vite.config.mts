import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: files => {
    const filteredFiles = files.filter(file => /\.(ts|tsx|js|jsx)$/.test(file))

    if (filteredFiles.length === 0) {
      return []
    }

    const fileList = filteredFiles.join(' ')

    return [`oxfmt ${fileList}`, `oxlint --fix --quiet --no-error-on-unmatched-pattern ${fileList}`]
  },
})
