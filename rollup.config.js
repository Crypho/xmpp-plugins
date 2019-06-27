import resolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import builtins from 'rollup-plugin-node-builtins'

const pkg = require(`${process.cwd()}/package.json`)

export default [
  // Browser-friendly UMD build
  {
    input: 'src/index.js',
    output: {
      name: pkg.name,
      file: pkg.browser,
      format: 'umd',
    },
    plugins: [
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      builtins(),
      babel({
        exclude: ['node_modules/**'],
      }),
    ],
  },
  // CommonJS (for Node) and ES module (for bundlers) build.
  // (We could have three entries in the configuration array
  // instead of two, but it's quicker to generate multiple
  // builds from a single configuration where possible, using
  // an array for the `output` option, where we can specify
  // `file` and `format` for each target)
  {
    input: 'src/index.js',
    output: [{file: pkg.main, format: 'cjs'}, {file: pkg.module, format: 'es'}],
    plugins: [
      builtins(),
      babel({
        exclude: ['node_modules/**'],
      }),
    ],
  },
]
