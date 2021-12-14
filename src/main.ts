import App from './App.vue'
import { createApp } from 'vue'
import router from './router'
import { store } from './store'
import BootstrapVue3 from 'bootstrap-vue-3'
import mitt from 'mitt'
import { VueMasonryPlugin } from 'vue-masonry'
import { Auth0Plugin } from './auth'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-3/dist/bootstrap-vue-3.css'
import '@/assets/styles/style.scss'

const emitter = mitt()
const app = createApp(App)

const initApp = () => {
  app.config.globalProperties.emitter = emitter
}
const initRouter = () => {
  app.use(router).use(store)
}

const initComponents = () => {
  app.use(BootstrapVue3).use(VueMasonryPlugin)
}

const mountApp = () => {
  app.mount('#app')
}

if (process.env.AUTH0_DOMAIN?.length) {
  const auth0Opts = {
    domain: process.env.AUTH0_DOMAIN,
    client_id: process.env.AUTH0_CLIENT_ID,
    audience: process.env.AUTH0_AUDIENCE,
    onRedirectCallback: (appState: any) => {
      router.push(appState && appState.targetUrl ? appState.targetUrl : window.location.pathname)
    },
  }

  initApp()
  initRouter()
  app.use(Auth0Plugin, auth0Opts)
  initComponents()
  mountApp()
} else {
  initApp()
  initRouter()
  initComponents()
  mountApp()
}
