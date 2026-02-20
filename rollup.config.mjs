import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';

/** @type {import('rollup').RollupOptions} */
export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/crm-sdk.cjs.js',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/crm-sdk.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    {
      file: 'dist/crm-sdk.umd.js',
      format: 'umd',
      name: 'CrmSdk',
      sourcemap: true,
    },
  ],
  plugins: [
    postcss({
      inject: false,
      minimize: true,
    }),
    resolve({ browser: true }),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' }),
  ],
};
