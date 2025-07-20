import i18n from '@/i18n'
import BootstrapVueNext from 'bootstrap-vue-next'
import mitt from 'mitt'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import VueGoogleMaps from 'vue-google-maps-community-fork'
import VueSocials from 'vue-socials'
import { useToast } from 'vue-toast-notification'
import VueCookies from 'vue3-cookies'
import { createBikeTag } from '.'
import App from './App.vue'
import { dynamicFontDirective } from './directives'
import router from './router'

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
import { BikeTagEnv, debug, isAuthenticationEnabled } from './common'

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
    this.app.use(router)
  }
  store() {
    const pinia = createPinia()
    const store = createBikeTag({ includeComponents: false, includeDirectives: false })
    this.app
      .use(pinia)
      .use(store)
    debug('app::store', store.storeName)
  }
  authentication() {
    if (isAuthenticationEnabled()) {
      debug('app::authentication', BikeTagEnv.A_DOMAIN)
      this.app.use(
        createAuth0({
          domain: BikeTagEnv.A_DOMAIN as string,
          clientId: BikeTagEnv.A_CID as string,
          authorizationParams: {
            redirect_uri: window.location.origin,
          },
          useRefreshTokens: true,
          cacheLocation: 'localstorage',
        }),
      )
    } else {
      debug('app::authentication', 'disabled')
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
        key: BikeTagEnv.G_AKEY,
        libraries: 'places',
        v: 3.54,
      },
    })
  }

  mount() {
    this.app.mount('#app')
    debug('app::init', 'mounted')
  }

  run() {
    this.init()
    this.authentication()
    this.cookies()
    this.internationalization()
    this.directives()
    this.components()
    this.router()
    this.store()
    this.mount()
  }
}

export default new BikeTagApp()
