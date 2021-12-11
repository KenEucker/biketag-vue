import App from './App.vue'
import { createApp } from 'vue'
import router from './router'
import { store } from './store'
import BootstrapVue3 from 'bootstrap-vue-3'
import mitt from 'mitt'
import { VueMasonryPlugin } from 'vue-masonry'
import { createVueWait } from 'vue-wait'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-3/dist/bootstrap-vue-3.css'
import '@/assets/styles/style.scss'

const emitter = mitt()
const app = createApp(App)
const VueWait = createVueWait({ useVuex: true })

app.config.globalProperties.emitter = emitter
app.use(router).use(store).use(VueWait).use(BootstrapVue3).use(VueMasonryPlugin).mount('#app')
