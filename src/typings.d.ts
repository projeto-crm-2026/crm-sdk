/** Tell TypeScript that importing a CSS file yields a CSS string (via rollup-plugin-postcss inject:false). */
declare module '*.css' {
  const content: string;
  export default content;
}
