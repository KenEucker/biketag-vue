import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import envCompatible from 'vite-plugin-env-compatible'
import EnvironmentPlugin from 'vite-plugin-environment'
import { createHtmlPlugin } from 'vite-plugin-html'
import { VitePWA } from 'vite-plugin-pwa'
import { BikeTagDefaults } from './src/common/constants'

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
    EnvironmentPlugin({
      /* Application Configuration */
      APP_ID: process.env.APP_ID ?? BikeTagDefaults.appId,
      ACCESS_TOKEN: process.env.ACCESS_TOKEN ?? BikeTagDefaults.accessToken,
      CONTEXT: process.env.CONTEXT ?? null,
      ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? BikeTagDefaults.admingEmail,
      AMBASSADOR_ROLE: process.env.AMBASSADOR_ROLE ?? BikeTagDefaults.sanityAmbassadorRoleID,
      PLAYER_ROLE: process.env.PLAYER_ROLE ?? BikeTagDefaults.sanityPlayerRoleID,
      /* Auth0 Configuration */
      A_AUDIENCE: process.env.A_AUDIENCE ?? null,
      A_CID: process.env.A_CID ?? null,
      A_DOMAIN: process.env.A_DOMAIN ?? null,
      A_M_CS: process.env.A_M_CS ?? null,
      A_M_CID: process.env.A_M_CID ?? null,
      /* Bugs Configuration */
      B_AKEY: process.env.B_AKEY ?? null,
      /* BikeTag Configuration */
      GAME_NAME: process.env.GAME_NAME ?? 'null',
      GAME_SOURCE: process.env.GAME_SOURCE ?? null,
      HOST: host,
      HOST_KEY: process.env.HOST_KEY ?? BikeTagDefaults.hostKey,
      /* Google Configuration */
      G_AKEY: process.env.G_AKEY ?? process.env.GOOGLE_ACCESS_TOKEN ?? null,
      G_CID: process.env.G_CID ?? process.env.GOOGLE_CLIENT_ID ?? null,
      G_CSECRET: process.env.G_CSECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? null,
      G_EMAIL: process.env.G_EMAIL ?? process.env.GOOGLE_EMAIL_ADDRESS ?? null,
      G_PASS: process.env.G_PASS ?? process.env.GOOGLE_PASSWORD ?? null,
      G_RTOKEN: process.env.G_RTOKEN ?? process.env.GOOGLE_REFRESH_TOKEN ?? null,
      /* Imgur Admin Configuration */
      IA_CID: process.env.IA_CID ?? process.env.IMGUR_ADMIN_CLIENT_ID ?? null,
      IA_CSECRET: process.env.IA_CSECRET ?? process.env.IMGUR_ADMIN_CLIENT_SECRET ?? null,
      IA_RTOKEN: process.env.IA_RTOKEN ?? process.env.IMGUR_ADMIN_REFRESH_TOKEN ?? null,
      IA_TOKEN: process.env.IA_TOKEN ?? process.env.IMGUR_ADMIN_ACCESS_TOKEN ?? null,
      /* Imgur Configuration */
      I_CID: process.env.I_CID ?? process.env.IMGUR_CLIENT_ID ?? null,
      I_CSECRET: process.env.I_CSECRET ?? process.env.IMGUR_CLIENT_SECRET ?? null,
      I_RTOKEN: process.env.I_RTOKEN ?? process.env.IMGUR_REFRESH_TOKEN ?? null,
      I_TOKEN: process.env.I_TOKEN ?? process.env.IMGUR_ACCESS_TOKEN ?? null,
      /* Sanity Admin Configuration */
      SA_CDN_URL: process.env.SA_CDN_URL ?? BikeTagDefaults.sanityImagesCDNUrl,
      SA_DSET: process.env.SA_DSET ?? process.env.SANITY_ADMIN_DATASET ?? null,
      SA_PID: process.env.SA_PID ?? process.env.SANITY_ADMIN_PROJECT_ID ?? null,
      SA_TOKEN: process.env.SA_TOKEN ?? process.env.SANITY_ADMIN_ACCESS_TOKEN ?? null,
      /* Sanity Configuration */
      S_CURL: process.env.S_CURL ?? BikeTagDefaults.sanityImagesCDNUrl,
      S_DSET: process.env.S_DSET ?? process.env.SANITY_DATASET ?? null,
      S_PID: process.env.S_PID ?? process.env.SANITY_PROJECT_ID ?? null,
      S_TOKEN: process.env.S_TOKEN ?? process.env.SANITY_ACCESS_TOKEN ?? null,
    }),
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
