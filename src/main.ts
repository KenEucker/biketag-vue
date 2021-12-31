import App from './App.vue'
import { createSSRApp, createApp } from 'vue'
import router from './router'
import { store } from './store'
import BootstrapVue3 from 'bootstrap-vue-3'
import mitt from 'mitt'
import { VueMasonryPlugin } from 'vue-masonry'
import { Auth0Plugin } from './auth'
import i18nPlugin from './i18n'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-3/dist/bootstrap-vue-3.css'
import '@/assets/styles/style.scss'

class BikeTagApp {
  protected emitter
  protected app

  constructor() {
    this.emitter = mitt()
    this.app = typeof window === 'undefined' ? createSSRApp(App) : createApp(App)
    this.run()
  }

  init() {
    this.app.config.globalProperties.emitter = this.emitter
  }
  internationalization() {
    this.app.use(i18nPlugin)
  }
  router() {
    this.app.use(router).use(store)
  }
  authentication() {
    if (process.env.AUTH0_DOMAIN?.length) {
      const auth0Opts = {
        domain: process.env.AUTH0_DOMAIN,
        client_id: process.env.AUTH0_CLIENT_ID,
        audience: process.env.AUTH0_AUDIENCE,
        onRedirectCallback: (appState: any) => {
          router.push(
            appState && appState.targetUrl ? appState.targetUrl : window.location.pathname
          )
        },
      }
      this.app.use(Auth0Plugin, auth0Opts)
    } else {
      this.app.config.globalProperties.$auth = () => () => null
    }
  }
  components() {
    this.app.use(BootstrapVue3).use(VueMasonryPlugin)
  }

  mount() {
    this.app.mount('#app')
  }

  run() {
    this.init()
    this.internationalization()
    this.router()
    this.authentication()
    this.components()
    this.mount()
  }
}

export default new BikeTagApp()
