import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';
import { defineConfig } from 'rollup';

const pkg = {
  main: 'dist/index.cjs.js',
  module: 'dist/index.esm.js',
  browser: 'dist/index.umd.js',
  types: 'dist/index.d.ts',
};

const external = ['leaflet', 'maplibre-gl'];

const sharedPlugins = [
  resolve({ browser: true }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    declarationDir: undefined,
    declarationMap: false,
  }),
];

export default defineConfig([
  // Main bundle: ESM
  {
    input: 'src/index.ts',
    external,
    plugins: sharedPlugins,
    output: {
      file: pkg.module,
      format: 'esm',
      sourcemap: true,
    },
  },
  // Main bundle: CJS
  {
    input: 'src/index.ts',
    external,
    plugins: sharedPlugins,
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
  },
  // Main bundle: UMD (browser)
  {
    input: 'src/index.ts',
    external,
    plugins: sharedPlugins,
    output: {
      file: pkg.browser,
      format: 'umd',
      name: 'VNGisMap',
      sourcemap: true,
      globals: {
        leaflet: 'L',
        'maplibre-gl': 'maplibregl',
      },
    },
  },
  // Type declarations - main
  {
    input: 'src/index.ts',
    external,
    plugins: [dts()],
    output: {
      file: pkg.types,
      format: 'esm',
    },
  },
  // Leaflet renderer sub-export: ESM
  {
    input: 'src/renderers/leaflet/index.ts',
    external: [...external, '../../core', '../../types', '../../utils'],
    plugins: sharedPlugins,
    output: {
      file: 'dist/renderers/leaflet.esm.js',
      format: 'esm',
      sourcemap: true,
    },
  },
  // Leaflet renderer sub-export: CJS
  {
    input: 'src/renderers/leaflet/index.ts',
    external: [...external, '../../core', '../../types', '../../utils'],
    plugins: sharedPlugins,
    output: {
      file: 'dist/renderers/leaflet.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
  },
  // MapLibre renderer sub-export: ESM
  {
    input: 'src/renderers/maplibre/index.ts',
    external: [...external, '../../core', '../../types', '../../utils'],
    plugins: sharedPlugins,
    output: {
      file: 'dist/renderers/maplibre.esm.js',
      format: 'esm',
      sourcemap: true,
    },
  },
  // MapLibre renderer sub-export: CJS
  {
    input: 'src/renderers/maplibre/index.ts',
    external: [...external, '../../core', '../../types', '../../utils'],
    plugins: sharedPlugins,
    output: {
      file: 'dist/renderers/maplibre.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
  },
  // Type declarations - Leaflet renderer
  {
    input: 'src/renderers/leaflet/index.ts',
    external,
    plugins: [dts()],
    output: {
      file: 'dist/renderers/leaflet.d.ts',
      format: 'esm',
    },
  },
  // Type declarations - MapLibre renderer
  {
    input: 'src/renderers/maplibre/index.ts',
    external,
    plugins: [dts()],
    output: {
      file: 'dist/renderers/maplibre.d.ts',
      format: 'esm',
    },
  },
]);
