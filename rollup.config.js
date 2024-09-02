import path from 'path'
import minimist from 'minimist'
import { getPackages } from '@lerna/project'
import { filterPackages } from '@lerna/filter-packages'
import batchPackages from '@lerna/batch-packages'
// import sourcemaps from 'rollup-plugin-sourcemaps'
import typescript from 'rollup-plugin-typescript2'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import babel from '@rollup/plugin-babel'
import json from '@rollup/plugin-json'
// import sizes from '@atomico/rollup-plugin-sizes'
// import autoExternal from 'rollup-plugin-auto-external'
// import importAssertions from 'rollup-plugin-import-assertions'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); 
const __dirname = path.dirname(__filename);

async function getSortedPackages(scope, ignore) {
  const packages = await getPackages(__dirname)
  const filtered = filterPackages(packages, scope, ignore, false)

  return batchPackages(filtered)
    .filter(item => !['@hocuspocus/docs', '@hocuspocus/demo'].includes(item.name))
    .reduce((arr, batch) => arr.concat(batch), [])
}

async function build(commandLineArgs) {
  const config = []

  // Support --scope and --ignore globs if passed in via commandline
  const { scope, ignore, ci } = minimist(process.argv.slice(2))
  const packages = await getSortedPackages(scope, ignore)

  // prevent rollup warning
  delete commandLineArgs.ci
  delete commandLineArgs.scope
  delete commandLineArgs.ignore

  packages.forEach(pkg => {
    const basePath = path.relative(__dirname, pkg.location)
    const input = path.join(basePath, 'src/index.ts')
    const {
      name,
      exports,
    } = pkg.toJSON()

    if (!exports) {
      return
    }

    const basePlugins = [
      // sourcemaps(),
      resolve(),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
      }),
      // sizes(),
      json(),
      // importAssertions(),
    ]

    config.push({
      // perf: true,
      input,
      output: [
        {
          name,
          file: path.join(basePath, exports.default.require),
          format: 'cjs',
          sourcemap: true,
          exports: 'auto',
        },
        {
          name,
          file: path.join(basePath, exports.default.import),
          format: 'es',
          sourcemap: true,
        },
      ],
      plugins: [
        // autoExternal({
          // packagePath: path.join(basePath, 'package.json'),
        // }),
        ...basePlugins,
        typescript({
          tsconfigOverride: {
            compilerOptions: {
              declaration: true,
              paths: {
                '@hocuspocus/*': ['packages/*/src'],
              },
            },
            include: [],
          },
        }),
      ],
    })
  })

  return config
}

export default build
