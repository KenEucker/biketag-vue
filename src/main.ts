import App from './App.vue'
import { createApp } from 'vue'
import router from './router'
import { store } from './store/'
import BootstrapVue3 from 'bootstrap-vue-3'
import mitt from 'mitt'
import { useToast } from 'vue-toast-notification'
import i18n from '@/i18n'
import VueCookies from 'vue3-cookies'
import VueGoogleMaps from '@fawmi/vue-google-maps'

// eslint-disable-next-line
// @ts-ignore
import Markdown from 'vue3-markdown-it'
// eslint-disable-next-line
// @ts-ignore
import VueIframe from 'vue-iframes'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-3/dist/bootstrap-vue-3.css'
import '@/assets/styles/style.scss'
import '@/assets/styles/flashy.scss'
import 'vue-toast-notification/dist/theme-sugar.css'
import 'highlight.js/styles/monokai.css'
import { debug } from './common/utils'
import { createHead } from '@vueuse/head'

import { createAuth0 } from '@auth0/auth0-vue'
class BikeTagApp {
  protected emitter
  protected app

  constructor() {
    this.emitter = mitt()
    // this.app = typeof window === 'undefined' ? createSSRApp(App) : createApp(App)
    this.app = createApp(App)
    this.run()
  }

  init() {
    this.app.config.globalProperties.emitter = this.emitter
    this.app.use(createHead())
  }
  internationalization() {
    this.app.use(i18n)
  }
  cookies() {
    this.app.use(VueCookies)
  }
  router() {
    this.app.use(router).use(store)
  }
  authentication() {
    if (process.env.A_DOMAIN?.length) {
      debug('init::authentication')
      const auth = createAuth0({
        domain: process.env.A_DOMAIN as string,
        clientId: process.env.A_CID as string,
        authorizationParams: {
          redirect_uri: window.location.origin,
        },
      })
      this.app.use(auth)
    }
  }
  components() {
    this.app.provide('toast', useToast())
    this.app.use(BootstrapVue3)
    this.app.use(Markdown)
    this.app.use(VueIframe)
    this.app.use(VueGoogleMaps, {
      load: {
        key: process.env.G_AKEY,
        libraries: 'places',
      },
    })
  }

  mount() {
    this.app.mount('#app')
  }

  run() {
    this.init()
    this.authentication()
    this.cookies()
    this.internationalization()
    this.components()
    this.router()
    this.mount()
  }
}

export default new BikeTagApp()
