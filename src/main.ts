import { createApp } from 'vue'
import App from './App.vue'
import Router from './router'
import PrimeVue from 'primevue/config'
import Card from 'primevue/card';

const app = createApp(App).use(Router)

app.use(PrimeVue)
app.component('Card', Card);
app.mount('#app')