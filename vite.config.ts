import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import envCompatible from 'vite-plugin-env-compatible'
import EnvironmentPlugin from 'vite-plugin-environment'
import { createHtmlPlugin } from 'vite-plugin-html'
import { VitePWA } from 'vite-plugin-pwa'

const host = process.env.HOST ?? 'biketag.org'
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
      ACCESS_TOKEN: process.env.ACCESS_TOKEN ?? '8b4e2b86a724bf3f39d6766de6e67212',
      CONTEXT: process.env.CONTEXT ?? null,
      APP_ID: process.env.APP_ID ?? 'com.app.biketag',
      ADMIN: process.env.ADMIN ?? 'biketag@biketag.org',
      AMBASSADOR_ROLE: process.env.AMBASSADOR_ROLE ?? 'rol_iET51vzIn8z6Utz0',
      PLAYER_ROLE: process.env.ADMIN ?? 'rol_pcbQ68Q9L0yn1o3O',
      /* Auth0 Configuration */
      A_AUDIENCE: process.env.A_AUDIENCE ?? null,
      A_CID: process.env.A_CID ?? null,
      A_DOMAIN: process.env.A_DOMAIN ?? null,
      // A_TOKEN: process.env.A_TOKEN ?? null,
      A_M_CS: process.env.A_M_CS ?? null,
      A_M_CID: process.env.A_M_CID ?? null,
      /* Bugs Configuration */
      B_AKEY: process.env.B_AKEY ?? null,
      /* Croquet Configuration */
      // C_AKEY: process.env.C_AKEY ?? null,
      // C_SNAME: process.env.C_SNAME ?? 'biketag',
      // C_SPASS: process.env.C_SPASS ?? 'secret',
      /* Google Configuration */
      G_AKEY: process.env.G_AKEY ?? null,
      G_CID: process.env.G_CID ?? null,
      G_CSECRET: process.env.G_CSECRET ?? null,
      G_EMAIL: process.env.G_EMAIL ?? null,
      G_PASS: process.env.G_PASS ?? null,
      G_RTOKEN: process.env.G_RTOKEN ?? null,
      /* BikeTag Configuration */
      GAME_NAME: process.env.GAME_NAME ?? 'null',
      GAME_SOURCE: process.env.GAME_SOURCE ?? null,
      HOST: host,
      HOST_KEY: process.env.HOST_KEY ?? 'ItsABikeTagGame',
      /* Imgur Admin Configuration */
      IA_CID: process.env.IA_CID ?? null,
      IA_CSECRET: process.env.IA_CSECRET ?? null,
      IA_RTOKEN: process.env.IA_RTOKEN ?? null,
      IA_TOKEN: process.env.IA_TOKEN ?? null,
      /* Imgur Configuration */
      I_CID: process.env.I_CID ?? null,
      I_CSECRET: process.env.I_CSECRET ?? null,
      I_RTOKEN: process.env.I_RTOKEN ?? null,
      I_TOKEN: process.env.I_TOKEN ?? null,
      /* Sanity Admin Configuration */
      SA_CDN_URL: process.env.SA_CDN_URL ?? 'https://cdn.sanity.io/images/',
      SA_DSET: process.env.SA_DSET ?? null,
      SA_PID: process.env.SA_PID ?? null,
      SA_TOKEN: process.env.SA_TOKEN ?? null,
      /* Sanity Configuration */
      S_CURL: process.env.S_CURL ?? 'https://cdn.sanity.io/images/',
      S_DSET: process.env.S_DSET ?? null,
      S_PID: process.env.S_PID ?? null,
      S_TOKEN: process.env.S_TOKEN ?? null,
      /* Reddit Configuration */
      R_CID: process.env.R_CID ?? null,
      R_CSECRET: process.env.R_CSECRET ?? null,
      R_UNAME: process.env.R_UNAME ?? null,
      R_PASS: process.env.R_PASS ?? null,
      RA_SUB: process.env.RA_SUB ?? 'biketag',
      /* Reddit Admin Configuration */
      RA_CID: process.env.RA_CID ?? null,
      RA_CSECRET: process.env.RA_CSECRET ?? null,
      RA_UNAME: process.env.RA_UNAME ?? null,
      RA_PASS: process.env.RA_PASS ?? null,
    }),
    VitePWA({
      srcDir: 'src',
      filename: 'worker.ts',
      strategies: 'injectManifest',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.png'],
      manifest: {
        name: 'BikeTag',
        short_name: 'BikeTag',
        description: 'BikeTag is a photo mystery tag game played on bicycles. No login required.',
        theme_color: '#000000',
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
          }
        ],
        screenshots: [
          {
            src: `https://${host}/images/biketag-screen-desktop-1.webp`,
            sizes: "389x366",
            type: "image/webp",
            form_factor: "wide",
            label: "BikeTag"
          },
          {
            src: `https://${host}/images/biketag-screen-mobile-1.webp`,
            sizes: "321x609",
            type: "image/webp",
            form_factor: "narrow",
            label: "BikeTag"
          }
        ]
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
