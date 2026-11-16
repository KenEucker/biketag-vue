import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { frontendEnvironment } from './config/frontend-environment'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      './runtimeConfig': './runtimeConfig.browser',
      '@aws-sdk/crc64-nvme-crt': '/src/empty.js',
      '@aws-sdk/signature-v4-crt': '/src/empty.js',
      '@aws-sdk/signature-v4a': '/src/empty.js',
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
  },
  plugins: [
    vue(),
    frontendEnvironment(),
    VitePWA({
      srcDir: 'src',
      // filename: 'worker.ts',
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      includeAssets: ['**/*'],
      // includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.png'],
      // The manifest URL is served dynamically by the Netlify function rewrite.
      manifest: false,
      workbox: {
        // Raw response links must reach the functions, even in an installed PWA.
        navigateFallbackDenylist: [/^\/\.netlify\/functions(?:\/|$)/],
        maximumFileSizeToCacheInBytes: 5000000, // Example: allow up to 5 MB
      },
    }),
    viteCommonjs(),
  ],
  build: {
    cssCodeSplit: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/biketag.[hash].js`,
        chunkFileNames: `assets/vendor.[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
      },
    },
  },
  // root: './public',
  server: {
    host: 'seattle.localhost',
    port: 8080,
  },
  preview: {
    port: 8080,
  },
})
