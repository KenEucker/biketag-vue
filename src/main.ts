import i18n from '@/i18n'
import BootstrapVueNext from 'bootstrap-vue-next'
import mitt from 'mitt'
import { createApp } from 'vue'
import VueGoogleMaps from 'vue-google-maps-community-fork'
import VueSocials from 'vue-socials'
import { useToast } from 'vue-toast-notification'
import VueCookies from 'vue3-cookies'
import App from './App.vue'
import { dynamicFontDirective } from './directives'
import router from './router'
import { store } from './store/'

// eslint-disable-next-line
// @ts-ignore
import Markdown from 'vue3-markdown-it'
// eslint-disable-next-line
// @ts-ignore
import VueIframe from 'vue-iframes'

import '@/assets/styles/flashy.scss'
import '@/assets/styles/style.scss'
import { createAuth0 } from '@auth0/auth0-vue'
import { createHead } from '@vueuse/head'
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css'
import 'bootstrap/dist/css/bootstrap.css'
import 'highlight.js/styles/monokai.css'
import 'vue-toast-notification/dist/theme-sugar.css'
import { debug, isAuthenticationEnabled } from './common/utils'

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
    if (isAuthenticationEnabled()) {
      debug('init::authentication', process.env.A_DOMAIN)
      this.app.use(
        createAuth0({
          domain: process.env.A_DOMAIN as string,
          clientId: process.env.A_CID as string,
          authorizationParams: {
            redirect_uri: window.location.origin,
          },
          useRefreshTokens: true,
          cacheLocation: 'localstorage',
        }),
      )
    } else {
      debug('init::authentication', 'authentication disabled')
    }
  }

  directives() {
    this.app.directive('dynamic-font', dynamicFontDirective)
  }
  components() {
    this.app.provide('toast', useToast())
    this.app.use(BootstrapVueNext)
    this.app.use(Markdown)
    this.app.use(VueIframe)
    this.app.use(VueSocials)
    this.app.use(VueGoogleMaps, {
      load: {
        key: process.env.G_AKEY,
        libraries: 'places',
        v: 3.54,
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
    this.directives()
    this.components()
    this.router()
    this.mount()
  }
}

export default new BikeTagApp()
