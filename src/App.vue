<template>
  <service-worker />
  <bike-tag-header />
  <router-view />
  <bike-tag-footer />
</template>
<script>
import { defineComponent } from 'vue'
import BikeTagHeader from '@/components/BikeTagHeader.vue'
import BikeTagFooter from '@/components/BikeTagFooter.vue'
import ServiceWorker from '@/components/ServiceWorker.vue'

export default defineComponent({
  name: 'App',
  components: {
    BikeTagHeader,
    BikeTagFooter,
    ServiceWorker,
  },
  async created() {
    await this.$store.dispatch('setGame')
  },
})
</script>
<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  overflow: hidden;
}

.card-body {
  border-radius: 0.25rem;
}
</style>
