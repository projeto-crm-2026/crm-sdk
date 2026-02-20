import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';

const shared = [
  replace({
    preventAssignment: true,
    'process.env.NODE_ENV': JSON.stringify('production'),
  }),
  postcss({
    inject: false,
    minimize: true,
  }),
  resolve({ browser: true }),
  commonjs(),
  typescript({ tsconfig: './tsconfig.json' }),
];

/** @type {import('rollup').RollupOptions[]} */
export default [
  // ESM + CJS — React is a peer dependency, don't bundle it
  {
    input: 'src/index.ts',
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
    output: [
      {
        file: 'dist/crm-sdk.esm.js',
        format: 'esm',
        sourcemap: true,
      },
      {
        file: 'dist/crm-sdk.cjs.js',
        format: 'cjs',
        sourcemap: true,
      },
    ],
    plugins: shared,
  },
  // UMD — bundle everything for <script> tag usage
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/crm-sdk.umd.js',
      format: 'umd',
      name: 'CrmSdk',
      sourcemap: true,
      globals: {
        react: 'React',
        'react-dom': 'ReactDOM',
        'react/jsx-runtime': 'jsxRuntime',
        'react-dom/client': 'ReactDOM',
      },
    },
    plugins: shared,
  },
];