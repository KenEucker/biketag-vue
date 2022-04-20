import App from './App.vue'
// import Vue from 'vue'
import { createApp } from 'vue'
import router from './router'
import { store } from './store'
import BootstrapVue3 from 'bootstrap-vue-3'
import mitt from 'mitt'
import { Auth0Plugin } from './auth'
import { createSession } from './notifications'
import i18nPlugin from './i18n'
import VueToast from 'vue-toast-notification'
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
import Bugsnag from '@bugsnag/js'
import BugsnagPluginVue from '@bugsnag/plugin-vue'

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
    this.app.use(i18nPlugin)
  }
  cookies() {
    this.app.use(VueCookies)
  }
  router() {
    this.app.use(router).use(store)
  }
  authentication() {
    if (process.env.A_DOMAIN?.length) {
      const auth0Opts = {
        domain: process.env.A_DOMAIN,
        client_id: process.env.A_CID,
        audience: process.env.A_AUDIENCE,
        onRedirectCallback: (appState: any) => {
          router.push(
            appState && appState.targetUrl ? appState.targetUrl : window.location.pathname
          )
        },
      }
      debug('init::authentication')
      this.app.use(Auth0Plugin, auth0Opts)
    } else {
      this.app.config.globalProperties.$auth = () => () => null
    }
  }
  bugs() {
    Bugsnag.start({
      apiKey: process.env.B_AKEY ?? '',
      plugins: [new BugsnagPluginVue()],
    })
    const bugsPlugin = Bugsnag.getPlugin('vue')

    // eslint-disable-next-line
    // @ts-ignore
    this.app.use(bugsPlugin)
    debug('init::bugs', bugsPlugin)
  }
  components() {
    this.app.use(VueToast)
    this.app.use(BootstrapVue3)
    this.app.use(Markdown)
    this.app.use(VueIframe)
    this.app.use(VueGoogleMaps, {
      load: {
        key: process.env.G_AKEY,
        libraries: 'places',
      },
    })
    // this.app.use(NotificationsPlugin)
  }
  async notifications() {
    if (process.env.C_AKEY) {
      this.app.config.globalProperties.$notifications = await createSession(this.app)
    } else {
      this.app.config.globalProperties.$notifications = { send: () => null }
    }
  }

  mount() {
    this.app.mount('#app')
  }

  run() {
    this.init()
    // this.bugs()
    this.authentication()
    this.cookies()
    this.notifications()
    this.internationalization()
    this.components()
    this.router()
    this.mount()
  }
}

export default new BikeTagApp()
