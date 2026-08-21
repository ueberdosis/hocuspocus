import fs from 'node:fs'
import path from 'node:path'
import type { OutExtensionFactory, PackUserConfig } from 'vite-plus/pack'

// vp pack runs inside each package directory, so the cwd package.json belongs
// to the package being built. The output stem is read from the exports map so
// published file names stay identical to the previous rolldown build.
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
const outName = path.basename(pkg.exports.default.import, '.esm.js')

export const hocuspocusOutExtensions: OutExtensionFactory = ({ format }) => {
  if (format === 'es') {
    return { js: '.esm.js', dts: '.d.ts' }
  }
  return { js: '.cjs', dts: '.d.cts' }
}

const basePackConfig = (): PackUserConfig => ({
  outDir: 'dist',
  tsconfig: '../../tsconfig.json',
  sourcemap: true,
  target: 'es2019',
  define: {
    __HOCUSPOCUS_VERSION__: JSON.stringify(pkg.version),
  },
  // keep every node_modules dependency external, like the rolldown build did
  deps: { neverBundle: true },
})

export const esmPackConfig = (): PackUserConfig => ({
  ...basePackConfig(),
  entry: { [outName]: 'src/index.ts' },
  format: ['es'],
  dts: false,
  clean: true,
  outExtensions: hocuspocusOutExtensions,
})

// CJS bundle. Packages can inline extra dependencies here (see server).
export const cjsPackConfig = (inlineDeps: string[] = []): PackUserConfig => ({
  ...basePackConfig(),
  entry: { [outName]: 'src/index.ts' },
  format: ['cjs'],
  dts: false,
  outExtensions: hocuspocusOutExtensions,
  noExternal: inlineDeps,
})

// Declaration bundle as a flat index.d.ts, matching the published types path.
export const dtsPackConfig = (): PackUserConfig => ({
  ...basePackConfig(),
  entry: { index: 'src/index.ts' },
  format: ['es'],
  dts: { emitDtsOnly: true },
  sourcemap: false,
  outExtensions: hocuspocusOutExtensions,
})

export const hocuspocusPackConfigs = (cjsInlineDeps: string[] = []): PackUserConfig[] => [
  esmPackConfig(),
  cjsPackConfig(cjsInlineDeps),
  dtsPackConfig(),
]
