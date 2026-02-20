import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

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
    resolve(),
    typescript({ tsconfig: './tsconfig.json' }),
  ],
};
