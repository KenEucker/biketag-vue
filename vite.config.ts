import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import envCompatible from 'vite-plugin-env-compatible'
import EnvironmentPlugin from 'vite-plugin-environment'
import { createHtmlPlugin } from 'vite-plugin-html'
import { VitePWA } from 'vite-plugin-pwa'
import { BikeTagDefaults, BikeTagEnv } from './src/common/constants'

const host = process.env.HOST ?? BikeTagDefaults.host
// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, 'src'),
      },
    ],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
  },
  css: {
    preprocessorOptions: {
      scss: { charset: false, additionalData: `@import "./src/assets/styles/mixins.scss";` },
      css: { charset: false },
    },
  },
  plugins: [
    vue(),
    EnvironmentPlugin(BikeTagEnv),
    VitePWA({
      srcDir: 'src',
      filename: 'worker.ts',
      strategies: 'injectManifest',
      registerType: 'autoUpdate',
      includeAssets: ['**/*'],
      // includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.png'],
      manifest: {
        name: BikeTagDefaults.manifest.name,
        short_name: BikeTagDefaults.manifest.shortName,
        description: BikeTagDefaults.manifest.description,
        theme_color: BikeTagDefaults.manifest.themeColor,
        icons: [
          {
            src: `https://${host}/android-chrome-192x192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `https://${host}/android-chrome-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `https://${host}/maskable_icon_x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: `https://${host}/images/biketag-screen-desktop-1.webp`,
            sizes: '389x366',
            type: 'image/webp',
            form_factor: 'wide',
            label: 'BikeTag',
          },
          {
            src: `https://${host}/images/biketag-screen-mobile-1.webp`,
            sizes: '321x609',
            type: 'image/webp',
            form_factor: 'narrow',
            label: 'BikeTag',
          },
        ],
      },
    }),
    viteCommonjs(),
    envCompatible(),
    createHtmlPlugin(),
  ],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/biketag.js`,
        chunkFileNames: `assets/vendor.js`,
        assetFileNames: `assets/[name].[ext]`,
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
