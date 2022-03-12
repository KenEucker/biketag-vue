import { defineConfig } from 'vite'
import path from 'path'
import vue from '@vitejs/plugin-vue'
import envCompatible from 'vite-plugin-env-compatible'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import { VitePWA } from 'vite-plugin-pwa'
import EnvironmentPlugin from 'vite-plugin-environment'
import { injectHtml } from 'vite-plugin-html'

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
    EnvironmentPlugin({
      /* Application Configuration */
      CONTEXT: process.env.CONTEXT ?? null,
      USE_AUTHENTICATION: process.env.USE_AUTHENTICATION ?? null,
      SUPER_ADMIN: process.env.SUPER_ADMIN ?? 'biketag@biketag.org',
      /* BikeTag Configuration */
      GAME_NAME: process.env.GAME_NAME ?? 'null',
      GAME_SOURCE: process.env.GAME_SOURCE ?? null,
      HOST: process.env.HOST ?? 'biketag.io',
      HOST_KEY: process.env.HOST_KEY ?? 'ItsABikeTagGame',
      ACCESS_TOKEN: process.env.ACCESS_TOKEN ?? '8b4e2b86a724bf3f39d6766de6e67212',
      /* Imgur Configuration */
      IMGUR_CLIENT_ID: process.env.IMGUR_CLIENT_ID ?? null,
      IMGUR_CLIENT_SECRET: process.env.IMGUR_CLIENT_SECRET ?? null,
      IMGUR_ACCESS_TOKEN: process.env.IMGUR_ACCESS_TOKEN ?? null,
      IMGUR_REFRESH_TOKEN: process.env.IMGUR_REFRESH_TOKEN ?? null,
      /* Imgur Admin Configuration */
      IMGUR_ADMIN_CLIENT_ID: process.env.IMGUR_ADMIN_CLIENT_ID ?? null,
      IMGUR_ADMIN_CLIENT_SECRET: process.env.IMGUR_ADMIN_CLIENT_SECRET ?? null,
      IMGUR_ADMIN_ACCESS_TOKEN: process.env.IMGUR_ADMIN_ACCESS_TOKEN ?? null,
      IMGUR_ADMIN_REFRESH_TOKEN: process.env.IMGUR_ADMIN_REFRESH_TOKEN ?? null,
      /* Sanity Configuration */
      SANITY_PROJECT_ID: process.env.SANITY_PROJECT_ID ?? null,
      SANITY_DATASET: process.env.SANITY_DATASET ?? null,
      SANITY_TOKEN: process.env.SANITY_TOKEN ?? null,
      SANITY_CDN_URL: process.env.SANITY_CDN_URL ?? 'https://cdn.sanity.io/images/',
      /* Sanity Admin Configuration */
      SANITY_ADMIN_PROJECT_ID: process.env.SANITY_ADMIN_PROJECT_ID ?? null,
      SANITY_ADMIN_DATASET: process.env.SANITY_ADMIN_DATASET ?? null,
      SANITY_ADMIN_TOKEN: process.env.SANITY_ADMIN_TOKEN ?? null,
      SANITY_ADMIN_CDN_URL: process.env.SANITY_ADMIN_CDN_URL ?? 'https://cdn.sanity.io/images/',
      /* Reddit Configuration */
      REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID ?? null,
      REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET ?? null,
      REDDIT_USERNAME: process.env.REDDIT_USERNAME ?? null,
      REDDIT_PASSWORD: process.env.REDDIT_PASSWORD ?? null,
      REDDIT_ADMIN_SUBREDDIT: process.env.REDDIT_ADMIN_SUBREDDIT ?? 'biketag',
      /* Reddit Admin Configuration */
      REDDIT_ADMIN_CLIENT_ID: process.env.REDDIT_ADMIN_CLIENT_ID ?? null,
      REDDIT_ADMIN_CLIENT_SECRET: process.env.REDDIT_ADMIN_CLIENT_SECRET ?? null,
      REDDIT_ADMIN_USERNAME: process.env.REDDIT_ADMIN_USERNAME ?? null,
      REDDIT_ADMIN_PASSWORD: process.env.REDDIT_ADMIN_PASSWORD ?? null,
      /* Auth0 Configuration */
      AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID ?? null,
      AUTH0_DOMAIN: process.env.AUTH0_DOMAIN ?? null,
      /* Google Configuration */
      GOOGLE_EMAIL_ADDRESS: process.env.GOOGLE_EMAIL_ADDRESS ?? null,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? null,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? null,
      GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN ?? null,
      GOOGLE_PASSWORD: process.env.GOOGLE_PASSWORD ?? null,
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ?? null,
      /* Croket Configuration */
      CROQUET_API_KEY: process.env.CROQUET_API_KEY ?? null,
      CROQUET_SESSION_NAME: process.env.CROQUET_SESSION_NAME ?? 'biketag',
      CROQUET_SESSION_PASSWORD: process.env.CROQUET_SESSION_PASSWORD ?? 'secret'
    }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'worker.ts',
      workbox: {
        sourcemap: true,
      },
      manifest: {
        name: 'BikeTag',
        short_name: 'BikeTag',
        description: 'The BikeTag Game',
        theme_color: '#000000',
        icons: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
    viteCommonjs(),
    envCompatible(),
    injectHtml(),
  ],
  build: {
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
    host: 'miami.localhost',
    port: 8080,
  },
  preview: {
    port: 8080,
  },
})
