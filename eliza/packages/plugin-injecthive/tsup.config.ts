import { defineConfig } from 'tsup';
import { builtinModules } from 'module';
import pkg from './package.json';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  minify: false,
  platform: 'node',
  target: 'node23',

  // Bundle problematic packages
  noExternal: [
    'form-data',
    'combined-stream',
    'delayed-stream',
    'mime-types',
    'mime-db',
    'asynckit',
    'util'
  ],

  external: [
    "@elizaos/core",
    ...builtinModules.filter(mod => mod !== 'util'),
    ...Object.keys(pkg.dependencies || {})
            .filter(dep => !['form-data', 'combined-stream', 'delayed-stream',
                           'mime-types', 'mime-db', 'asynckit'].includes(dep))
  ],

  esbuildOptions: (options) => {
    options.mainFields = ['module', 'main'];
    options.banner = {
      js: `
        import { createRequire } from 'module';
        import { fileURLToPath } from 'url';
        import { dirname } from 'path';
        const require = createRequire(import.meta.url);
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
      `
    };
    options.define = {
      'process.env.NODE_ENV': '"production"'
    };
    // Add path aliases for @injective imports
    options.alias = {
      '@injective/template': './injective-sdk-client-ts/src/template',
      '@injective/examples': './injective-sdk-client-ts/src/examples',
      '@injective/similes': './injective-sdk-client-ts/src/similes',
      '@injective/modules': './injective-sdk-client-ts/src/modules'
    };
  }
});