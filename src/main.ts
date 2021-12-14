import App from './App.vue'
import { createApp } from 'vue'
import router from './router'
import { store } from './store'
import BootstrapVue3 from 'bootstrap-vue-3'
import mitt from 'mitt'
import { VueMasonryPlugin } from 'vue-masonry'
import Auth from './auth'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-3/dist/bootstrap-vue-3.css'
import '@/assets/styles/style.scss'
import { RouteLocationRaw } from 'vue-router'

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
  Auth.init({
    onRedirectCallback: (appState: { targetUrl: RouteLocationRaw }) => {
      router.push(appState && appState.targetUrl ? appState.targetUrl : window.location.pathname)
    },
  })
    .then((AuthPlugin) => {
      initApp()
      initRouter()
      app.use(AuthPlugin)
      initComponents()
      mountApp()
    })
    .catch((e) => {
      initApp()
      initRouter()
      initComponents()
      mountApp()
    })
} else {
  initApp()
  initRouter()
  initComponents()
  mountApp()
}
